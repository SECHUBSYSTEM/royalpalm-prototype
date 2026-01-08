import { getDB, type CachedPalm } from "./db";
import axiosInstance from "@/lib/api/axios";

export interface Palm {
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
}

const PAGE_SIZE = 1000;

/**
 * Get palm from local cache
 */
export async function getPalmFromCache(qrCode: string): Promise<Palm | null> {
  const db = await getDB();
  const tx = db.transaction("palms_cache", "readonly");
  const store = tx.store;

  const cached = await store.get(qrCode);
  if (!cached) {
    return null;
  }

  // Convert cached palm to Palm interface
  return {
    id: cached.id,
    qrCode: cached.qrCode,
    blockId: cached.blockId,
    blockName: cached.blockName,
    blockCode: cached.blockCode,
    rowNumber: cached.rowNumber,
    columnNumber: cached.columnNumber,
    plantingDate: cached.plantingDate,
    variety: cached.variety,
    status: cached.status,
  };
}

/**
 * Save single palm to cache
 */
export async function cachePalm(palm: Palm): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("palms_cache", "readwrite");
  const store = tx.store;

  const cached: CachedPalm = {
    id: palm.id,
    qrCode: palm.qrCode,
    blockId: palm.blockId,
    blockName: palm.blockName,
    blockCode: palm.blockCode,
    rowNumber: palm.rowNumber,
    columnNumber: palm.columnNumber,
    plantingDate: palm.plantingDate,
    variety: palm.variety,
    status: palm.status,
    cachedAt: Date.now(),
  };

  await store.put(cached);
  await tx.done;
}

/**
 * Sync all palms to cache (paginated)
 */
export async function syncPalmsToCache(
  onProgress?: (synced: number, total: number) => void
): Promise<void> {
  const db = await getDB();

  let page = 1;
  let totalSynced = 0;
  let hasMore = true;
  let total = 0;

  while (hasMore) {
    try {
      // Fetch palms from API
      const response = await axiosInstance.get(
        `/api/palms?page=${page}&limit=${PAGE_SIZE}`
      );

      const { palms, total: totalCount, hasMore: more } = response.data;
      total = totalCount;

      // Create a new transaction for this batch
      const tx = db.transaction("palms_cache", "readwrite");
      const store = tx.store;

      // Cache all palms from this page
      for (const palm of palms) {
        const cached: CachedPalm = {
          id: palm.id,
          qrCode: palm.qrCode,
          blockId: palm.blockId,
          blockName: palm.blockName,
          blockCode: palm.blockCode,
          rowNumber: palm.rowNumber,
          columnNumber: palm.columnNumber,
          plantingDate: palm.plantingDate,
          variety: palm.variety,
          status: palm.status,
          cachedAt: Date.now(),
        };
        await store.put(cached);
      }

      // Wait for transaction to complete
      await tx.done;

      totalSynced += palms.length;
      hasMore = more;
      page++;

      // Report progress
      if (onProgress) {
        onProgress(totalSynced, total);
      }

      // If we got fewer than PAGE_SIZE, we're done
      if (palms.length < PAGE_SIZE) {
        hasMore = false;
      }
    } catch (error) {
      console.error("Error syncing palms:", error);
      throw error;
    }
  }
}

/**
 * Clear all cached palms
 */
export async function clearPalmCache(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("palms_cache", "readwrite");
  const store = tx.store;

  await store.clear();
  await tx.done;
}
