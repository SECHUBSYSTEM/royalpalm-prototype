"use client";

import { useEffect, useState } from "react";

interface PalmSyncStatusProps {
  onSyncComplete?: () => void;
}

export default function PalmSyncStatus({
  onSyncComplete,
}: PalmSyncStatusProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState({ synced: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we need to sync palms
    const checkAndSync = async () => {
      if (!navigator.onLine) {
        return;
      }

      // Check if cache exists and is recent (less than 24 hours old)
      try {
        const { getDB } = await import("@/lib/offline/db");
        const db = await getDB();
        const tx = db.transaction("palms_cache", "readonly");
        const store = tx.store;
        const count = await store.count();

        // If cache is empty or very old, sync
        if (count === 0) {
          setIsSyncing(true);
          setError(null);

          const { syncPalmsToCache } = await import("@/lib/offline/palms");
          await syncPalmsToCache((synced, total) => {
            setProgress({ synced, total });
          });

          setIsSyncing(false);
          onSyncComplete?.();
        }
      } catch (err) {
        console.error("Palm sync error:", err);
        setError(err instanceof Error ? err.message : "Sync failed");
        setIsSyncing(false);
      }
    };

    checkAndSync();
  }, [onSyncComplete]);

  if (!isSyncing && !error) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="rounded-lg bg-white p-4 shadow-lg border border-gray-200 min-w-[300px]">
        {isSyncing && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
              <span className="text-sm font-medium text-gray-700">
                Syncing palms...
              </span>
            </div>
            {progress.total > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(progress.synced / progress.total) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {progress.synced} / {progress.total} palms
                </p>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="text-sm text-red-600">
            <p className="font-medium">Sync Error</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
