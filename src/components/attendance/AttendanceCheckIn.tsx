"use client";

import { useState } from "react";
import {
  saveCheckInOffline,
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
  const [checkedIn, setCheckedIn] = useState(false);
  const { updateStatus } = useSyncStore();

  const handleCheckIn = async () => {
    setLoading(true);
    setError(null);

    try {
      // Check if already checked in today
      const todayAttendance = await getTodayAttendanceOffline(employeeId);
      if (todayAttendance && !todayAttendance.check_out) {
        setError("You have already checked in today");
        setCheckedIn(true);
        setLoading(false);
        return;
      }

      await saveCheckInOffline({
        employeeId,
        checkIn: new Date(),
        verifiedBy: "FINGERPRINT", // TODO: Implement actual fingerprint verification
      });

      await updateStatus();
      setCheckedIn(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check in");
    } finally {
      setLoading(false);
    }
  };

  if (checkedIn) {
    return (
      <div className="bg-green-100 text-green-800 p-4 rounded-lg">
        <p className="font-semibold">✓ Checked in successfully!</p>
        <p className="text-sm mt-1">
          Your attendance has been recorded and will sync when online.
        </p>
      </div>
    );
  }

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

      <button
        onClick={handleCheckIn}
        disabled={loading}
        className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer font-medium">
        {loading ? "Checking in..." : "Check In"}
      </button>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Note: Fingerprint verification will be implemented in the full version
      </p>
    </div>
  );
}
