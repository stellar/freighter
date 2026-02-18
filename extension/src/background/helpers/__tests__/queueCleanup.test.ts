import {
  cleanupQueue,
  startQueueCleanup,
  QUEUE_ITEM_TTL_MS,
} from "../queueCleanup";
import {
  TransactionQueue,
  BlobQueue,
  EntryQueue,
  TokenQueue,
  ResponseQueue,
} from "@shared/api/types/message-request";

describe("queueCleanup", () => {
  describe("cleanupQueue", () => {
    it("removes expired items from queue", () => {
      const now = Date.now();
      const expiredTime = now - QUEUE_ITEM_TTL_MS - 1000; // 1 second past TTL
      const validTime = now - 1000; // 1 second ago

      const queue = [
        { uuid: "expired-1", createdAt: expiredTime },
        { uuid: "valid-1", createdAt: validTime },
        { uuid: "expired-2", createdAt: expiredTime },
        { uuid: "valid-2", createdAt: validTime },
      ];

      const removedCount = cleanupQueue(queue);

      expect(removedCount).toBe(2);
      expect(queue).toHaveLength(2);
      expect(queue.map((item) => item.uuid)).toEqual(["valid-1", "valid-2"]);
    });

    it("does not remove items that are not expired", () => {
      const now = Date.now();
      const validTime = now - 1000; // 1 second ago

      const queue = [
        { uuid: "valid-1", createdAt: validTime },
        { uuid: "valid-2", createdAt: validTime },
      ];

      const removedCount = cleanupQueue(queue);

      expect(removedCount).toBe(0);
      expect(queue).toHaveLength(2);
    });

    it("removes all items when all are expired", () => {
      const expiredTime = Date.now() - QUEUE_ITEM_TTL_MS - 1000;

      const queue = [
        { uuid: "expired-1", createdAt: expiredTime },
        { uuid: "expired-2", createdAt: expiredTime },
      ];

      const removedCount = cleanupQueue(queue);

      expect(removedCount).toBe(2);
      expect(queue).toHaveLength(0);
    });

    it("handles empty queue", () => {
      const queue: { uuid: string; createdAt: number }[] = [];

      const removedCount = cleanupQueue(queue);

      expect(removedCount).toBe(0);
      expect(queue).toHaveLength(0);
    });

    it("uses custom TTL when provided", () => {
      const now = Date.now();
      const customTtl = 1000; // 1 second
      const expiredTime = now - customTtl - 100;
      const validTime = now - customTtl + 100;

      const queue = [
        { uuid: "expired", createdAt: expiredTime },
        { uuid: "valid", createdAt: validTime },
      ];

      const removedCount = cleanupQueue(queue, customTtl);

      expect(removedCount).toBe(1);
      expect(queue).toHaveLength(1);
      expect(queue[0].uuid).toBe("valid");
    });

    it("removes items exactly at TTL boundary", () => {
      const now = Date.now();
      const exactlyAtTtl = now - QUEUE_ITEM_TTL_MS;

      const queue = [{ uuid: "at-boundary", createdAt: exactlyAtTtl }];

      const removedCount = cleanupQueue(queue);

      // Items at exactly the TTL boundary should NOT be removed (cutoff is <, not <=)
      expect(removedCount).toBe(0);
      expect(queue).toHaveLength(1);
    });

    it("removes items without createdAt as invalid", () => {
      const validTime = Date.now() - 1000;

      // Cast to bypass TypeScript - simulating malformed data
      const queue = [
        { uuid: "no-timestamp" },
        { uuid: "valid", createdAt: validTime },
        { uuid: "zero-timestamp", createdAt: 0 },
      ] as { uuid: string; createdAt: number }[];

      const removedCount = cleanupQueue(queue);

      // Items without createdAt or with createdAt=0 should be removed
      expect(removedCount).toBe(2);
      expect(queue).toHaveLength(1);
      expect(queue[0].uuid).toBe("valid");
    });
  });

  describe("startQueueCleanup", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("cleans up expired items periodically", () => {
      const expiredTime = Date.now() - QUEUE_ITEM_TTL_MS - 1000;
      const validTime = Date.now() - 1000;

      const responseQueue: ResponseQueue<unknown> = [
        { response: jest.fn(), uuid: "expired", createdAt: expiredTime },
        { response: jest.fn(), uuid: "valid", createdAt: validTime },
      ];
      const transactionQueue: TransactionQueue = [
        { transaction: {} as any, uuid: "expired", createdAt: expiredTime },
      ];
      const tokenQueue: TokenQueue = [
        {
          token: {} as any,
          uuid: "valid",
          createdAt: validTime,
        },
      ];
      const blobQueue: BlobQueue = [];
      const authEntryQueue: EntryQueue = [];

      const stopCleanup = startQueueCleanup(
        {
          responseQueue,
          transactionQueue,
          tokenQueue,
          blobQueue,
          authEntryQueue,
        },
        1000, // 1 second interval for testing
      );

      // Initially all items are present
      expect(responseQueue).toHaveLength(2);
      expect(transactionQueue).toHaveLength(1);
      expect(tokenQueue).toHaveLength(1);

      // Advance time to trigger cleanup
      jest.advanceTimersByTime(1000);

      // Expired items should be removed
      expect(responseQueue).toHaveLength(1);
      expect(responseQueue[0].uuid).toBe("valid");
      expect(transactionQueue).toHaveLength(0);
      expect(tokenQueue).toHaveLength(1);
      expect(tokenQueue[0].uuid).toBe("valid");

      stopCleanup();
    });

    it("returns function that stops cleanup", () => {
      const responseQueue: ResponseQueue<unknown> = [];
      const transactionQueue: TransactionQueue = [];
      const tokenQueue: TokenQueue = [];
      const blobQueue: BlobQueue = [];
      const authEntryQueue: EntryQueue = [];

      const stopCleanup = startQueueCleanup(
        {
          responseQueue,
          transactionQueue,
          tokenQueue,
          blobQueue,
          authEntryQueue,
        },
        1000,
      );

      // Add expired item
      const expiredTime = Date.now() - QUEUE_ITEM_TTL_MS - 1000;
      responseQueue.push({
        response: jest.fn(),
        uuid: "expired",
        createdAt: expiredTime,
      });

      // Stop cleanup
      stopCleanup();

      // Advance time
      jest.advanceTimersByTime(2000);

      // Item should still be there since cleanup was stopped
      expect(responseQueue).toHaveLength(1);
    });
  });
});
