"use client";

import { useEffect, useState } from "react";
import { useSyncStore } from "@/stores/sync-store";

export default function SyncStatus() {
  const [mounted, setMounted] = useState(false);
  const {
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    lastSyncTime,
    updateStatus,
    sync,
  } = useSyncStore();

  useEffect(() => {
    // Set mounted state asynchronously to avoid synchronous setState warning
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);

    // Update status on mount and periodically
    updateStatus();
    const interval = setInterval(updateStatus, 30000); // Every 30 seconds

    // Also update when window gains focus (user comes back to tab)
    const handleFocus = () => {
      updateStatus();
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [updateStatus]);

  const handleSync = async () => {
    try {
      await sync();
    } catch (error) {
      console.error("Sync failed:", error);
    }
  };

  // Prevent hydration mismatch by only rendering on client
  if (!mounted) {
    return null;
  }

  if (!isOnline && pendingCount === 0) {
    return null; // Don't show if offline and nothing to sync
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="rounded-lg bg-white p-4 shadow-lg border border-gray-200 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`h-2 w-2 rounded-full ${
                isOnline ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          {pendingCount > 0 && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              {pendingCount} pending
            </span>
          )}
        </div>

        {pendingCount > 0 && (
          <div className="mt-2">
            <button
              onClick={handleSync}
              disabled={isSyncing || !isOnline}
              className="w-full text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed cursor-pointer">
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        )}

        {lastSyncTime && (
          <p className="text-xs text-gray-500 mt-2">
            Last sync: {lastSyncTime.toLocaleTimeString()}
          </p>
        )}

        {failedCount > 0 && (
          <p className="text-xs text-red-600 mt-1">
            {failedCount} failed to sync
          </p>
        )}
      </div>
    </div>
  );
}
