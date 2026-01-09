import { create } from "zustand";
import {
  getSyncStatus,
  syncAll,
  checkConnectivity,
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
  trySilentSync: () => Promise<void>;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  lastSyncTime: null,

  sync: async () => {
    const state = get();
    if (state.isSyncing) {
      console.log("[Sync] Already syncing, skipping...");
      return {
        activities: { success: true, synced: 0, failed: 0 },
        attendance: { success: true, synced: 0, failed: 0 },
      };
    }

    // Check actual connectivity before syncing
    const isOnline = await checkConnectivity();
    if (!isOnline) {
      console.log("[Sync] Not online, skipping sync");
      set({ isOnline: false });
      return {
        activities: { success: true, synced: 0, failed: 0 },
        attendance: { success: true, synced: 0, failed: 0 },
      };
    }

    set({ isSyncing: true, isOnline: true });
    try {
      const results = await syncAll();
      await get().updateStatus();
      return results;
    } catch (error) {
      console.error("[Sync] Error:", error);
      throw error;
    } finally {
      set({ isSyncing: false });
    }
  },

  updateStatus: async () => {
    if (typeof window === "undefined") return;

    try {
      const status = await getSyncStatus();
      set({
        isOnline: status.isOnline,
        pendingCount: status.pendingCount,
        failedCount: status.failedCount,
        lastSyncTime: status.lastSyncTime,
      });
    } catch (error) {
      console.error("[Sync] Update status error:", error);
    }
  },

  setOnline: async (online: boolean) => {
    set({ isOnline: online });
    await get().updateStatus();

    // Auto-sync when coming back online
    if (online) {
      // Small delay to ensure network is fully ready
      setTimeout(() => {
        get().trySilentSync();
      }, 500);
    }
  },

  // Silent sync - doesn't throw errors, just logs them
  trySilentSync: async () => {
    const state = get();
    if (state.isSyncing) return;

    try {
      const status = await getSyncStatus();
      if (status.isOnline && status.pendingCount > 0) {
        console.log(
          `[Sync] Auto-syncing ${status.pendingCount} pending items...`
        );
        await get().sync();
      }
    } catch (error) {
      console.error("[Sync] Silent sync failed:", error);
    }
  },
}));

// Initialize sync store on client side
if (typeof window !== "undefined") {
  // Listen to online/offline events
  window.addEventListener("online", async () => {
    console.log("[Sync] Browser reports online");
    const store = useSyncStore.getState();
    await store.setOnline(true);
  });

  window.addEventListener("offline", async () => {
    console.log("[Sync] Browser reports offline");
    const store = useSyncStore.getState();
    await store.setOnline(false);
  });

  // Listen to visibility change - when tab becomes visible, check and sync
  document.addEventListener("visibilitychange", async () => {
    if (!document.hidden) {
      const store = useSyncStore.getState();
      await store.updateStatus();
      // Try silent sync if needed
      setTimeout(() => {
        store.trySilentSync();
      }, 300);
    }
  });

  // Periodic sync check every 30 seconds
  setInterval(async () => {
    const store = useSyncStore.getState();
    if (!store.isSyncing) {
      await store.updateStatus();
      // Try silent sync if needed
      if (store.isOnline && store.pendingCount > 0) {
        store.trySilentSync();
      }
    }
  }, 30000);

  // Initial status check
  setTimeout(() => {
    useSyncStore.getState().updateStatus();
  }, 1000);
}
