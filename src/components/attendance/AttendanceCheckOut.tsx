"use client";

import { useState } from "react";
import { saveCheckOutHybrid } from "@/lib/offline/attendance";
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
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const { updateStatus, sync } = useSyncStore();

  const handleCheckOut = async () => {
    setLoading(true);
    setError(null);
    setSyncStatus(null);

    try {
      // Use hybrid save - tries Supabase first, falls back to IndexedDB
      const result = await saveCheckOutHybrid(employeeId, new Date());

      console.log("[Check-Out] Result:", result);

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
      console.error("[Check-Out] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to check out");
    } finally {
      setLoading(false);
    }
  };

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

      {syncStatus && (
        <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm">
          {syncStatus}
        </div>
      )}

      <button
        onClick={handleCheckOut}
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer font-medium flex items-center justify-center gap-2">
        {loading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Checking out...
          </>
        ) : (
          "Check Out"
        )}
      </button>

      <p className="text-xs text-gray-500 mt-4 text-center">
        Works offline - your attendance will be saved locally and synced when online
      </p>
    </div>
  );
}
