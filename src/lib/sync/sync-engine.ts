import {
  getDB,
  type ActivityQueueItem,
  type AttendanceQueueItem,
} from "@/lib/offline/db";
import axiosInstance, { axiosWithRetry } from "@/lib/api/axios";

const BATCH_SIZE = 50;

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors?: string[];
}

/**
 * Sync pending activities from IndexedDB to server
 */
export const syncActivities = async (): Promise<SyncResult> => {
  const db = await getDB();
  const tx = db.transaction("activities_queue", "readwrite");
  const store = tx.store;
  const index = store.index("by-synced");

  // Get all unsynced activities
  // Note: IDBKeyRange.only() doesn't work with boolean values
  // So we iterate through all records and filter
  const unsynced: ActivityQueueItem[] = [];
  let cursor = await index.openCursor();
  while (cursor) {
    if (cursor.value.synced === false) {
      unsynced.push(cursor.value);
    }
    cursor = await cursor.continue();
  }

  if (unsynced.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  const results: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  // Process in batches
  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const batch = unsynced.slice(i, i + BATCH_SIZE);

    try {
      await axiosWithRetry(
        () => axiosInstance.post("/api/activities/sync", { activities: batch }),
        3,
        1000
      );

      // Mark as synced
      for (const activity of batch) {
        await store.put({ ...activity, synced: true });
        results.synced++;
      }
    } catch (error) {
      results.success = false;
      results.failed += batch.length;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.errors?.push(`Batch ${i / BATCH_SIZE + 1}: ${errorMessage}`);
    }
  }

  await tx.done;
  return results;
};

/**
 * Sync pending attendance records from IndexedDB to server
 */
export const syncAttendance = async (): Promise<SyncResult> => {
  const db = await getDB();
  const tx = db.transaction("attendance_queue", "readwrite");
  const store = tx.store;
  const index = store.index("by-synced");

  // Get all unsynced attendance records
  // Note: IDBKeyRange.only() doesn't work with boolean values
  // So we iterate through all records and filter
  const unsynced: AttendanceQueueItem[] = [];
  let cursor = await index.openCursor();
  while (cursor) {
    if (cursor.value.synced === false) {
      unsynced.push(cursor.value);
    }
    cursor = await cursor.continue();
  }

  if (unsynced.length === 0) {
    return { success: true, synced: 0, failed: 0 };
  }

  const results: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    errors: [],
  };

  // Process in batches
  for (let i = 0; i < unsynced.length; i += BATCH_SIZE) {
    const batch = unsynced.slice(i, i + BATCH_SIZE);

    try {
      await axiosWithRetry(
        () => axiosInstance.post("/api/attendance/sync", { attendance: batch }),
        3,
        1000
      );

      // Mark as synced
      for (const record of batch) {
        await store.put({ ...record, synced: true });
        results.synced++;
      }
    } catch (error) {
      results.success = false;
      results.failed += batch.length;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.errors?.push(`Batch ${i / BATCH_SIZE + 1}: ${errorMessage}`);
    }
  }

  await tx.done;
  return results;
};

/**
 * Sync all pending data (activities + attendance)
 */
export const syncAll = async (): Promise<{
  activities: SyncResult;
  attendance: SyncResult;
}> => {
  const [activities, attendance] = await Promise.all([
    syncActivities(),
    syncAttendance(),
  ]);

  // Update sync metadata
  const db = await getDB();
  const metadataStore = db.transaction("sync_metadata", "readwrite").store;

  await metadataStore.put({
    key: "last_sync",
    last_sync_time: Date.now(),
    pending_count: activities.failed + attendance.failed,
    failed_count: activities.failed + attendance.failed,
  });

  return { activities, attendance };
};

/**
 * Check actual internet connectivity (not just navigator.onLine)
 */
const checkConnectivity = async (): Promise<boolean> => {
  // First check navigator.onLine (fast check)
  if (!navigator.onLine) {
    return false;
  }

  // Then verify actual connectivity with a lightweight request
  try {
    // Use a small fetch with short timeout to verify connectivity
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

    // Try to fetch a lightweight resource (favicon or root)
    // This doesn't require authentication and is very small
    const response = await fetch("/favicon.ico", {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-cache",
    });

    clearTimeout(timeoutId);
    // If we get any response (even 404), we're online
    // Status 0 means network error (offline)
    return response.status !== 0;
  } catch {
    // Network error or timeout - we're offline
    return false;
  }
};

/**
 * Get sync status
 */
export const getSyncStatus = async () => {
  const db = await getDB();

  const activitiesTx = db.transaction("activities_queue", "readonly");
  const activitiesIndex = activitiesTx.store.index("by-synced");
  let pendingActivities = 0;
  let activitiesCursor = await activitiesIndex.openCursor();
  while (activitiesCursor) {
    if (activitiesCursor.value.synced === false) {
      pendingActivities++;
    }
    activitiesCursor = await activitiesCursor.continue();
  }

  const attendanceTx = db.transaction("attendance_queue", "readonly");
  const attendanceIndex = attendanceTx.store.index("by-synced");
  let pendingAttendance = 0;
  let attendanceCursor = await attendanceIndex.openCursor();
  while (attendanceCursor) {
    if (attendanceCursor.value.synced === false) {
      pendingAttendance++;
    }
    attendanceCursor = await attendanceCursor.continue();
  }

  const metadataStore = db.transaction("sync_metadata", "readonly").store;
  const metadata = await metadataStore.get("last_sync");

  // Check actual connectivity, not just navigator.onLine
  const isOnline = await checkConnectivity();

  return {
    isOnline,
    pendingCount: pendingActivities + pendingAttendance,
    failedCount: metadata?.failed_count || 0,
    lastSyncTime: metadata?.last_sync_time
      ? new Date(metadata.last_sync_time)
      : null,
  };
};
