import { getDB, type ActivityQueueItem } from "./db";

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

/**
 * Save activity to offline queue
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
