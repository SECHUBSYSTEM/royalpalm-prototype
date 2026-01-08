import { getDB, type AttendanceQueueItem } from "./db";

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

/**
 * Save attendance check-in to offline queue
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
 * Save attendance check-out to offline queue
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
  await store.put(foundRecord);
  await tx.done;

  return foundRecord.id;
};

/**
 * Get today's attendance for an employee
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
