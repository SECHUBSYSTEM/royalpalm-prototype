"use client";

import { useState } from "react";
import {
  saveCheckInHybrid,
  getTodayAttendanceOffline,
} from "@/lib/offline/attendance";
import { useSyncStore } from "@/stores/sync-store";

interface AttendanceCheckInProps {
  employeeId: string;
  employeeName: string;
  onSuccess?: () => void;
}

export default function AttendanceCheckIn({
  employeeId,
  employeeName,
  onSuccess,
}: AttendanceCheckInProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const { updateStatus, sync } = useSyncStore();

  const handleCheckIn = async () => {
    setLoading(true);
    setError(null);
    setSyncStatus(null);

    try {
      // Check if already checked in today
      const todayAttendance = await getTodayAttendanceOffline(employeeId);
      if (todayAttendance && !todayAttendance.check_out) {
        setError("You have already checked in today");
        setLoading(false);
        // Still call onSuccess to refresh the parent's state
        onSuccess?.();
        return;
      }

      // Use hybrid save - tries Supabase first, falls back to IndexedDB
      const result = await saveCheckInHybrid({
        employeeId,
        checkIn: new Date(),
        verifiedBy: "FINGERPRINT",
      });

      console.log("[Check-In] Result:", result);

      // Update sync status display
      if (result.synced) {
        setSyncStatus("Saved to cloud");
      } else {
        setSyncStatus("Saved offline - will sync later");
        // Try background sync if not synced
        setTimeout(() => {
          sync().catch(console.error);
        }, 100);
      }

      // Update sync store status
      await updateStatus();

      // Small delay to ensure IndexedDB state is readable
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Call onSuccess to refresh the parent's state
      onSuccess?.();
    } catch (err) {
      console.error("[Check-In] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to check in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Check In - {employeeName}
      </h3>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {syncStatus && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm">
          {syncStatus}
        </div>
      )}

      <button
        onClick={handleCheckIn}
        disabled={loading}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer font-medium flex items-center justify-center gap-2">
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Checking in...
          </>
        ) : (
          "Check In"
        )}
      </button>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Works offline - your attendance will be saved locally and synced when online
      </p>
    </div>
  );
}
