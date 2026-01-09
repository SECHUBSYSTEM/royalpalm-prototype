import { getDB, type ActivityQueueItem } from "./db";
import axiosInstance from "@/lib/api/axios";

// Use crypto.randomUUID() in browser (available in modern browsers)
const generateId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export interface ActivityFormData {
  palmId: string;
  activityType: string;
  activityDate: Date;
  details?: Record<string, unknown>;
  notes?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  workerId: string;
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
 * Save activity to offline queue (IndexedDB only)
 */
export const saveActivityOffline = async (
  data: ActivityFormData
): Promise<string> => {
  const db = await getDB();
  const tx = db.transaction("activities_queue", "readwrite");
  const store = tx.store;

  const activity: ActivityQueueItem = {
    id: generateId(),
    palm_id: data.palmId,
    activity_type: data.activityType,
    data: {
      workerId: data.workerId,
      activityDate: data.activityDate.toISOString(),
      ...data.details,
      notes: data.notes,
      gpsLatitude: data.gpsLatitude,
      gpsLongitude: data.gpsLongitude,
    },
    synced: false,
    created_at: Date.now(),
  };

  await store.add(activity);
  await tx.done;

  return activity.id;
};

/**
 * Hybrid save: Try Supabase first when online, fallback to IndexedDB
 */
export const saveActivityHybrid = async (
  data: ActivityFormData
): Promise<HybridSaveResult> => {
  const isOnline = await checkConnectivity();

  // Try Supabase first if online
  if (isOnline) {
    try {
      const response = await axiosInstance.post("/api/activities/create", {
        palmId: data.palmId,
        workerId: data.workerId,
        activityType: data.activityType,
        activityDate: data.activityDate.toISOString(),
        details: data.details,
        notes: data.notes,
        gpsLatitude: data.gpsLatitude,
        gpsLongitude: data.gpsLongitude,
      });

      const supabaseId = response.data.id;

      // Also save to IndexedDB for local cache (marked as synced)
      const db = await getDB();
      const tx = db.transaction("activities_queue", "readwrite");
      const store = tx.store;

      const activity: ActivityQueueItem = {
        id: supabaseId,
        palm_id: data.palmId,
        activity_type: data.activityType,
        data: {
          workerId: data.workerId,
          activityDate: data.activityDate.toISOString(),
          ...data.details,
          notes: data.notes,
          gpsLatitude: data.gpsLatitude,
          gpsLongitude: data.gpsLongitude,
        },
        synced: true, // Already synced to Supabase
        created_at: Date.now(),
      };

      await store.put(activity);
      await tx.done;

      console.log("[Hybrid Activity] Saved to Supabase and IndexedDB");
      return { saved: true, synced: true, id: supabaseId };
    } catch (error) {
      // Supabase failed, fallback to IndexedDB
      console.warn("[Hybrid Activity] Supabase failed, using IndexedDB:", error);
    }
  }

  // Fallback to IndexedDB (offline or Supabase failed)
  const localId = await saveActivityOffline(data);
  console.log("[Hybrid Activity] Saved to IndexedDB only (will sync later)");
  return { saved: true, synced: false, id: localId };
};

/**
 * Get activity by ID from offline queue
 */
export const getActivityOffline = async (
  id: string
): Promise<ActivityQueueItem | undefined> => {
  const db = await getDB();
  const tx = db.transaction("activities_queue", "readonly");
  const store = tx.store;

  return await store.get(id);
};

/**
 * Get all activities for a palm (synced and unsynced)
 */
export const getPalmActivitiesOffline = async (
  palmId: string
): Promise<ActivityQueueItem[]> => {
  const db = await getDB();
  const tx = db.transaction("activities_queue", "readonly");
  const store = tx.store;
  const index = store.index("by-palm-id");

  const activities: ActivityQueueItem[] = [];
  let cursor = await index.openCursor(IDBKeyRange.only(palmId));
  while (cursor) {
    activities.push(cursor.value);
    cursor = await cursor.continue();
  }

  return activities;
};
