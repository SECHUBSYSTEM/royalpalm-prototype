import { openDB, IDBPDatabase } from "idb";

export interface ActivityQueueItem {
  id: string;
  palm_id: string;
  activity_type: string;
  data: Record<string, unknown>;
  synced: boolean;
  created_at: number;
}

export interface AttendanceQueueItem {
  id: string;
  employee_id: string;
  check_in: number;
  check_out: number | null;
  synced: boolean;
  created_at: number;
}

export interface SyncMetadataItem {
  key: string;
  last_sync_time: number | null;
  pending_count: number;
  failed_count: number;
}

export interface CachedPalm {
  id: string;
  qrCode: string;
  blockId: string;
  blockName: string;
  blockCode: string;
  rowNumber?: number | null;
  columnNumber?: number | null;
  plantingDate?: string | null;
  variety?: string | null;
  status: string;
  cachedAt: number;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface RoyalPalmDB {
  activities_queue: {
    key: string;
    value: ActivityQueueItem;
    indexes: {
      "by-synced": boolean;
      "by-palm-id": string;
      "by-created": number;
    };
  };
  attendance_queue: {
    key: string;
    value: AttendanceQueueItem;
    indexes: {
      "by-synced": boolean;
      "by-employee-id": string;
      "by-created": number;
    };
  };
  sync_metadata: {
    key: string;
    value: SyncMetadataItem;
  };
}

const DB_NAME = "royalpalm-offline";
const DB_VERSION = 2;

let dbInstance: IDBPDatabase | null = null;

export const getDB = async (): Promise<IDBPDatabase> => {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Activities queue store
      if (!db.objectStoreNames.contains("activities_queue")) {
        const activitiesStore = db.createObjectStore("activities_queue", {
          keyPath: "id",
        });
        activitiesStore.createIndex("by-synced", "synced");
        activitiesStore.createIndex("by-palm-id", "palm_id");
        activitiesStore.createIndex("by-created", "created_at");
      }

      // Attendance queue store
      if (!db.objectStoreNames.contains("attendance_queue")) {
        const attendanceStore = db.createObjectStore("attendance_queue", {
          keyPath: "id",
        });
        attendanceStore.createIndex("by-synced", "synced");
        attendanceStore.createIndex("by-employee-id", "employee_id");
        attendanceStore.createIndex("by-created", "created_at");
      }

      // Sync metadata store
      if (!db.objectStoreNames.contains("sync_metadata")) {
        db.createObjectStore("sync_metadata", {
          keyPath: "key",
        });
      }

      // Palms cache store
      if (!db.objectStoreNames.contains("palms_cache")) {
        const palmsStore = db.createObjectStore("palms_cache", {
          keyPath: "qrCode",
        });
        palmsStore.createIndex("by-block", "blockCode");
        palmsStore.createIndex("by-status", "status");
      }
    },
  });

  return dbInstance;
};

export const closeDB = async (): Promise<void> => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};
