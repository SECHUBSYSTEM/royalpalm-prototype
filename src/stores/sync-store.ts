import { create } from "zustand";
import {
  getSyncStatus,
  syncAll,
  type SyncResult,
} from "@/lib/sync/sync-engine";

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime: Date | null;
  sync: () => Promise<{ activities: SyncResult; attendance: SyncResult }>;
  updateStatus: () => Promise<void>;
  setOnline: (online: boolean) => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  lastSyncTime: null,

  sync: async () => {
    if (get().isSyncing || !get().isOnline) {
      throw new Error("Cannot sync: already syncing or offline");
    }

    set({ isSyncing: true });
    try {
      const results = await syncAll();
      await get().updateStatus();
      return results;
    } finally {
      set({ isSyncing: false });
    }
  },

  updateStatus: async () => {
    if (typeof window === "undefined") return;

    const status = await getSyncStatus();
    set({
      isOnline: status.isOnline,
      pendingCount: status.pendingCount,
      failedCount: status.failedCount,
      lastSyncTime: status.lastSyncTime,
    });
  },

  setOnline: async (online: boolean) => {
    set({ isOnline: online });
    // Update status immediately when online/offline changes
    await get().updateStatus();
    // Auto-sync when coming back online - wait for status update first
    if (online) {
      const { pendingCount } = get();
      if (pendingCount > 0) {
        // Small delay to ensure network is fully ready
        setTimeout(() => {
          get()
            .sync()
            .catch((err) => {
              console.error("Auto-sync failed:", err);
              // Update status again in case sync failed
              get().updateStatus();
            });
        }, 1000);
      }
    }
  },
}));

// Listen to online/offline events
if (typeof window !== "undefined") {
  window.addEventListener("online", async () => {
    const store = useSyncStore.getState();
    await store.setOnline(true);
  });

  window.addEventListener("offline", async () => {
    const store = useSyncStore.getState();
    await store.setOnline(false);
  });

  // Also listen to visibility change - when tab becomes visible, check status and auto-sync
  document.addEventListener("visibilitychange", async () => {
    if (!document.hidden) {
      const store = useSyncStore.getState();
      await store.updateStatus();
      // If online and have pending items, auto-sync
      if (store.isOnline && store.pendingCount > 0) {
        setTimeout(() => {
          store.sync().catch(console.error);
        }, 500);
      }
    }
  });
}
