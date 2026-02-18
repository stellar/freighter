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

/**
 * Removes expired items from a queue based on their createdAt timestamp.
 * Items older than the TTL are removed. Items without createdAt are also removed
 * as they are considered invalid.
 */
export function cleanupQueue<T extends { createdAt: number }>(
  queue: T[],
  ttlMs: number = QUEUE_ITEM_TTL_MS,
): number {
  const now = Date.now();
  const cutoffTime = now - ttlMs;
  let removedCount = 0;

  // Iterate backwards to safely remove items while iterating
  for (let i = queue.length - 1; i >= 0; i--) {
    const createdAt = queue[i].createdAt;
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
 */
export function startQueueCleanup(
  queues: {
    responseQueue: { createdAt: number }[];
    transactionQueue: TransactionQueue;
    tokenQueue: TokenQueue;
    blobQueue: BlobQueue;
    authEntryQueue: EntryQueue;
  },
  intervalMs: number = CLEANUP_INTERVAL_MS,
  ttlMs: number = QUEUE_ITEM_TTL_MS,
): () => void {
  const intervalId = setInterval(() => {
    cleanupQueue(queues.responseQueue, ttlMs);
    cleanupQueue(queues.transactionQueue, ttlMs);
    cleanupQueue(queues.tokenQueue, ttlMs);
    cleanupQueue(queues.blobQueue, ttlMs);
    cleanupQueue(queues.authEntryQueue, ttlMs);
  }, intervalMs);

  return () => clearInterval(intervalId);
}
