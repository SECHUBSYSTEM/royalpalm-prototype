// Activity Types
export enum ActivityType {
  FERTILISER = 'FERTILISER',
  HARVESTING = 'HARVESTING',
  PRUNING = 'PRUNING',
  DISEASE_INSPECTION = 'DISEASE_INSPECTION',
  SPRAYING = 'SPRAYING',
  WEEDING = 'WEEDING',
  MORTALITY = 'MORTALITY',
}

// Palm ID format: RP-[BLOCK]-[SEQUENCE]
export type PalmID = string;

export interface Palm {
  id: string;
  blockId: string;
  qrCode: string;
  rowNumber?: number;
  columnNumber?: number;
  plantingDate?: Date;
  variety?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'DEAD' | 'REPLACED';
}

export interface ActivityData {
  palmId: string;
  activityType: ActivityType;
  activityDate: Date;
  details?: Record<string, unknown>;
  notes?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
}

export interface AttendanceData {
  employeeId: string;
  checkIn: Date;
  checkOut?: Date;
  verifiedBy: 'FINGERPRINT' | 'PIN' | 'SUPERVISOR_OVERRIDE';
}

export interface SyncStatus {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime: Date | null;
  isSyncing: boolean;
}


