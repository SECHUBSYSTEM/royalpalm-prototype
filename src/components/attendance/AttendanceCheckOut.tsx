"use client";

import { useState } from "react";
import { saveCheckOutOffline } from "@/lib/offline/attendance";
import { useSyncStore } from "@/stores/sync-store";

interface AttendanceCheckOutProps {
  employeeId: string;
  employeeName: string;
  onSuccess?: () => void;
}

export default function AttendanceCheckOut({
  employeeId,
  employeeName,
  onSuccess,
}: AttendanceCheckOutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedOut, setCheckedOut] = useState(false);
  const { updateStatus } = useSyncStore();

  const handleCheckOut = async () => {
    setLoading(true);
    setError(null);

    try {
      await saveCheckOutOffline(employeeId, new Date());
      await updateStatus();
      setCheckedOut(true);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check out");
    } finally {
      setLoading(false);
    }
  };

  if (checkedOut) {
    return (
      <div className="bg-blue-100 text-blue-800 p-4 rounded-lg">
        <p className="font-semibold">✓ Checked out successfully!</p>
        <p className="text-sm mt-1">
          Your attendance has been recorded and will sync when online.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">
        Check Out - {employeeName}
      </h3>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <button
        onClick={handleCheckOut}
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer font-medium">
        {loading ? "Checking out..." : "Check Out"}
      </button>
    </div>
  );
}
