import {
  TransactionQueue,
  BlobQueue,
  EntryQueue,
  TokenQueue,
} from "@shared/api/types/message-request";

// Default TTL is 5 minutes (in milliseconds)
export const QUEUE_ITEM_TTL_MS = 5 * 60 * 1000;

// Cleanup interval is 1 minute
export const CLEANUP_INTERVAL_MS = 60 * 1000;

// Set of UUIDs that have active popups open - these should not be cleaned up.
// In MV3, this resets when the service worker restarts, which also resets the queues.
export const activeQueueUuids: Set<string> = new Set();

/**
 * Removes expired items from a queue based on their createdAt timestamp.
 * Items older than the TTL are removed. Items without createdAt are also removed
 * as they are considered invalid.
 * Items with UUIDs in the activeUuids set are skipped (popup is open).
 */
export function cleanupQueue<T extends { createdAt: number; uuid?: string }>(
  queue: T[],
  ttlMs: number = QUEUE_ITEM_TTL_MS,
  activeUuids: Set<string> = activeQueueUuids,
): number {
  const now = Date.now();
  const cutoffTime = now - ttlMs;
  let removedCount = 0;

  // Iterate backwards to safely remove items while iterating
  for (let i = queue.length - 1; i >= 0; i--) {
    const item = queue[i];
    const createdAt = item.createdAt;

    // Skip items that have an active popup open
    if (item.uuid && activeUuids.has(item.uuid)) {
      continue;
    }

    // Remove if expired OR if createdAt is missing/invalid
    if (!createdAt || createdAt < cutoffTime) {
      queue.splice(i, 1);
      removedCount++;
    }
  }

  return removedCount;
}

/**
 * Sets up periodic cleanup for all provided queues.
 * Returns a function to stop the cleanup interval.
 * Items with UUIDs in activeQueueUuids are preserved (popup is open).
 */
export function startQueueCleanup(
  queues: {
    responseQueue: { createdAt: number; uuid?: string }[];
    transactionQueue: TransactionQueue;
    tokenQueue: TokenQueue;
    blobQueue: BlobQueue;
    authEntryQueue: EntryQueue;
  },
  intervalMs: number = CLEANUP_INTERVAL_MS,
  ttlMs: number = QUEUE_ITEM_TTL_MS,
): () => void {
  const intervalId = setInterval(() => {
    cleanupQueue(queues.responseQueue, ttlMs, activeQueueUuids);
    cleanupQueue(queues.transactionQueue, ttlMs, activeQueueUuids);
    cleanupQueue(queues.tokenQueue, ttlMs, activeQueueUuids);
    cleanupQueue(queues.blobQueue, ttlMs, activeQueueUuids);
    cleanupQueue(queues.authEntryQueue, ttlMs, activeQueueUuids);
  }, intervalMs);

  return () => clearInterval(intervalId);
}
