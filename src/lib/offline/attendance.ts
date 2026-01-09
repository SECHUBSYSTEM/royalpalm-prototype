import { getDB, type AttendanceQueueItem } from "./db";
import axiosInstance from "@/lib/api/axios";

// Use crypto.randomUUID() in browser (available in modern browsers)
const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export interface AttendanceFormData {
  employeeId: string;
  checkIn: Date;
  checkOut?: Date;
  verifiedBy: "FINGERPRINT" | "PIN" | "SUPERVISOR_OVERRIDE";
}

export interface HybridSaveResult {
  saved: boolean;
  synced: boolean;
  id: string;
}

/**
 * Check actual internet connectivity (not just navigator.onLine)
 */
const checkConnectivity = async (): Promise<boolean> => {
  if (typeof navigator === "undefined") return false;
  
  // First check navigator.onLine (fast check)
  if (!navigator.onLine) {
    return false;
  }

  // Then verify actual connectivity with a lightweight request
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch("/favicon.ico", {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-cache",
    });

    clearTimeout(timeoutId);
    return response.status !== 0;
  } catch {
    return false;
  }
};

/**
 * Save attendance check-in to offline queue (IndexedDB only)
 */
export const saveCheckInOffline = async (
  data: AttendanceFormData
): Promise<string> => {
  const db = await getDB();
  const tx = db.transaction("attendance_queue", "readwrite");
  const store = tx.store;

  // Check if employee already has an open check-in today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  const index = store.index("by-employee-id");
  let cursor = await index.openCursor();
  while (cursor) {
    const record = cursor.value;
    if (
      record.employee_id === data.employeeId &&
      record.check_in >= todayStart &&
      record.check_in < todayEnd &&
      !record.check_out
    ) {
      throw new Error("Employee already checked in today");
    }
    cursor = await cursor.continue();
  }

  const attendance: AttendanceQueueItem = {
    id: generateId(),
    employee_id: data.employeeId,
    check_in: data.checkIn.getTime(),
    check_out: null,
    synced: false,
    created_at: Date.now(),
  };

  await store.add(attendance);
  await tx.done;

  return attendance.id;
};

/**
 * Hybrid check-in: Try Supabase first when online, fallback to IndexedDB
 */
export const saveCheckInHybrid = async (
  data: AttendanceFormData
): Promise<HybridSaveResult> => {
  const isOnline = await checkConnectivity();

  // Try Supabase first if online
  if (isOnline) {
    try {
      const response = await axiosInstance.post("/api/attendance/check-in", {
        employeeId: data.employeeId,
        checkIn: data.checkIn.getTime(),
        verifiedBy: data.verifiedBy,
      });

      const supabaseId = response.data.id;

      // Also save to IndexedDB for local cache (marked as synced)
      const db = await getDB();
      const tx = db.transaction("attendance_queue", "readwrite");
      const store = tx.store;

      const attendance: AttendanceQueueItem = {
        id: supabaseId,
        employee_id: data.employeeId,
        check_in: data.checkIn.getTime(),
        check_out: null,
        synced: true, // Already synced to Supabase
        created_at: Date.now(),
      };

      await store.put(attendance);
      await tx.done;

      console.log("[Hybrid Check-In] Saved to Supabase and IndexedDB");
      return { saved: true, synced: true, id: supabaseId };
    } catch (error) {
      // Supabase failed, fallback to IndexedDB
      console.warn("[Hybrid Check-In] Supabase failed, using IndexedDB:", error);
    }
  }

  // Fallback to IndexedDB (offline or Supabase failed)
  const localId = await saveCheckInOffline(data);
  console.log("[Hybrid Check-In] Saved to IndexedDB only (will sync later)");
  return { saved: true, synced: false, id: localId };
};

/**
 * Save attendance check-out to offline queue (IndexedDB only)
 */
export const saveCheckOutOffline = async (
  employeeId: string,
  checkOut: Date
): Promise<string> => {
  const db = await getDB();
  const tx = db.transaction("attendance_queue", "readwrite");
  const store = tx.store;
  const index = store.index("by-employee-id");

  // Find today's check-in without check-out
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  let cursor = await index.openCursor();
  let foundRecord: AttendanceQueueItem | null = null;

  while (cursor) {
    const record = cursor.value;
    if (
      record.employee_id === employeeId &&
      record.check_in >= todayStart &&
      record.check_in < todayEnd &&
      !record.check_out
    ) {
      foundRecord = record;
      break;
    }
    cursor = await cursor.continue();
  }

  if (!foundRecord) {
    throw new Error("No open check-in found for today");
  }

  // Update with check-out time
  foundRecord.check_out = checkOut.getTime();
  foundRecord.synced = false; // Mark as unsynced since we updated it
  await store.put(foundRecord);
  await tx.done;

  return foundRecord.id;
};

/**
 * Hybrid check-out: Try Supabase first when online, fallback to IndexedDB
 */
export const saveCheckOutHybrid = async (
  employeeId: string,
  checkOut: Date
): Promise<HybridSaveResult> => {
  const isOnline = await checkConnectivity();

  // Try Supabase first if online
  if (isOnline) {
    try {
      const response = await axiosInstance.post("/api/attendance/check-out", {
        employeeId: employeeId,
        checkOut: checkOut.getTime(),
      });

      const supabaseId = response.data.id;

      // Update IndexedDB for local cache (marked as synced)
      const db = await getDB();
      const tx = db.transaction("attendance_queue", "readwrite");
      const store = tx.store;
      const index = store.index("by-employee-id");

      // Find today's check-in and update it
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.getTime();
      const todayEnd = todayStart + 24 * 60 * 60 * 1000;

      let cursor = await index.openCursor();
      while (cursor) {
        const record = cursor.value;
        if (
          record.employee_id === employeeId &&
          record.check_in >= todayStart &&
          record.check_in < todayEnd
        ) {
          record.check_out = checkOut.getTime();
          record.synced = true;
          await store.put(record);
          break;
        }
        cursor = await cursor.continue();
      }
      await tx.done;

      console.log("[Hybrid Check-Out] Saved to Supabase and IndexedDB");
      return { saved: true, synced: true, id: supabaseId };
    } catch (error) {
      // Supabase failed, fallback to IndexedDB
      console.warn("[Hybrid Check-Out] Supabase failed, using IndexedDB:", error);
    }
  }

  // Fallback to IndexedDB (offline or Supabase failed)
  const localId = await saveCheckOutOffline(employeeId, checkOut);
  console.log("[Hybrid Check-Out] Saved to IndexedDB only (will sync later)");
  return { saved: true, synced: false, id: localId };
};

/**
 * Get today's attendance for an employee (always from IndexedDB)
 */
export const getTodayAttendanceOffline = async (
  employeeId: string
): Promise<AttendanceQueueItem | null> => {
  const db = await getDB();
  const tx = db.transaction("attendance_queue", "readonly");
  const store = tx.store;
  const index = store.index("by-employee-id");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  let cursor = await index.openCursor();
  while (cursor) {
    const record = cursor.value;
    if (
      record.employee_id === employeeId &&
      record.check_in >= todayStart &&
      record.check_in < todayEnd
    ) {
      return record;
    }
    cursor = await cursor.continue();
  }

  return null;
};

/**
 * Clear today's attendance for an employee (for testing)
 */
export const clearTodayAttendanceOffline = async (
  employeeId: string
): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction("attendance_queue", "readwrite");
  const store = tx.store;
  const index = store.index("by-employee-id");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const todayEnd = todayStart + 24 * 60 * 60 * 1000;

  let cursor = await index.openCursor();
  while (cursor) {
    const record = cursor.value;
    if (
      record.employee_id === employeeId &&
      record.check_in >= todayStart &&
      record.check_in < todayEnd
    ) {
      await store.delete(record.id);
    }
    cursor = await cursor.continue();
  }
  await tx.done;
};
