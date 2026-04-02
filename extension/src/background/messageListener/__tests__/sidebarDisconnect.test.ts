import browser from "webextension-polyfill";
import {
  setSidebarPort,
  clearSidebarPort,
  getSidebarPort,
} from "background/helpers/sidebarPort";
import {
  clearSidebarWindowId,
  responseQueue,
  transactionQueue,
  blobQueue,
  authEntryQueue,
  tokenQueue,
} from "background/messageListener/popupMessageListener";
import {
  sidebarQueueUuids,
  activeQueueUuids,
} from "background/helpers/queueCleanup";
import { initSidebarConnectionListener } from "background/index";
import { SIDEBAR_PORT_NAME } from "popup/components/SidebarSigningListener";

// Mock browser API
jest.mock("webextension-polyfill", () => ({
  runtime: {
    onConnect: {
      addListener: jest.fn(),
    },
    getURL: (path: string) => `chrome-extension://fake-id${path}`,
  },
  windows: {
    onRemoved: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
}));

// Suppress buildStore and other background imports
jest.mock("background/store", () => ({
  buildStore: jest.fn(),
}));

function createMockPort(
  name: string,
  sender?: { tab?: { id: number }; url?: string },
): browser.Runtime.Port {
  const messageListeners: Array<(msg: unknown) => void> = [];
  const disconnectListeners: Array<() => void> = [];

  return {
    name,
    sender,
    postMessage: jest.fn(),
    disconnect: jest.fn(),
    onMessage: {
      addListener: (fn: (msg: unknown) => void) => messageListeners.push(fn),
      removeListener: jest.fn(),
      hasListener: jest.fn(),
      hasListeners: jest.fn(),
    },
    onDisconnect: {
      addListener: (fn: () => void) => disconnectListeners.push(fn),
      removeListener: jest.fn(),
      hasListener: jest.fn(),
      hasListeners: jest.fn(),
    },
    // Helpers for tests to trigger events
    _fireMessage: (msg: unknown) => messageListeners.forEach((fn) => fn(msg)),
    _fireDisconnect: () => disconnectListeners.forEach((fn) => fn()),
  } as unknown as browser.Runtime.Port & {
    _fireMessage: (msg: unknown) => void;
    _fireDisconnect: () => void;
  };
}

type MockPort = ReturnType<typeof createMockPort>;

describe("initSidebarConnectionListener", () => {
  let onConnectCallback: (port: browser.Runtime.Port) => void;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    // Clear global state
    clearSidebarPort();
    clearSidebarWindowId();
    sidebarQueueUuids.clear();
    activeQueueUuids.clear();
    responseQueue.length = 0;
    transactionQueue.length = 0;
    blobQueue.length = 0;
    authEntryQueue.length = 0;
    tokenQueue.length = 0;

    // Register the listener
    initSidebarConnectionListener();
    onConnectCallback = (browser.runtime.onConnect.addListener as jest.Mock)
      .mock.calls[0][0];
  });

  afterEach(() => {
    jest.useRealTimers();
    clearSidebarPort();
    clearSidebarWindowId();
    sidebarQueueUuids.clear();
    activeQueueUuids.clear();
  });

  function connectSidebarPort(sender?: {
    tab?: { id: number };
    url?: string;
  }): MockPort {
    const port = createMockPort(
      SIDEBAR_PORT_NAME,
      sender ?? {
        url: "chrome-extension://fake-id/index.html",
      },
    );
    onConnectCallback(port);
    return port as unknown as MockPort;
  }

  describe("port connection", () => {
    it("ignores ports with non-sidebar names", () => {
      const port = createMockPort("other-port");
      onConnectCallback(port);
      expect(getSidebarPort()).toBeNull();
    });

    it("rejects connections from content scripts (has sender.tab)", () => {
      const port = createMockPort(SIDEBAR_PORT_NAME, {
        tab: { id: 1 },
        url: "https://evil.com",
      });
      onConnectCallback(port);
      expect(port.disconnect).toHaveBeenCalled();
      expect(getSidebarPort()).toBeNull();
    });

    it("accepts connections from extension pages", () => {
      const port = connectSidebarPort();
      expect(getSidebarPort()).toBe(port);
    });

    it("sets sidebarWindowId from the first message", () => {
      const {
        getSidebarWindowId,
      } = require("background/messageListener/popupMessageListener");
      const port = connectSidebarPort();
      (port as any)._fireMessage({ windowId: 42 });
      expect(getSidebarWindowId()).toBe(42);
    });

    it("ignores malformed windowId messages", () => {
      const {
        getSidebarWindowId,
      } = require("background/messageListener/popupMessageListener");
      clearSidebarWindowId();
      const port = connectSidebarPort();
      (port as any)._fireMessage({ windowId: "not-a-number" });
      expect(getSidebarWindowId()).toBeNull();
      (port as any)._fireMessage({ foo: "bar" });
      expect(getSidebarWindowId()).toBeNull();
    });
  });

  describe("disconnect cleanup", () => {
    it("clears port and windowId when active port disconnects", () => {
      const {
        getSidebarWindowId,
      } = require("background/messageListener/popupMessageListener");
      const port = connectSidebarPort();
      (port as any)._fireMessage({ windowId: 42 });

      (port as any)._fireDisconnect();

      expect(getSidebarPort()).toBeNull();
      expect(getSidebarWindowId()).toBeNull();
    });

    it("rejects sidebar requests after the deferred cleanup fires", () => {
      const port = connectSidebarPort();
      const mockResponse = jest.fn();

      sidebarQueueUuids.add("uuid-1");
      responseQueue.push({
        response: mockResponse,
        uuid: "uuid-1",
        createdAt: Date.now(),
      } as any);
      transactionQueue.push({
        transaction: {} as any,
        uuid: "uuid-1",
        createdAt: Date.now(),
      });

      (port as any)._fireDisconnect();

      // Before timeout fires, request should still be in queue
      expect(mockResponse).not.toHaveBeenCalled();
      expect(responseQueue).toHaveLength(1);

      // After timeout fires, request should be rejected
      jest.advanceTimersByTime(500);

      expect(mockResponse).toHaveBeenCalledWith(undefined);
      expect(responseQueue).toHaveLength(0);
      expect(transactionQueue).toHaveLength(0);
      expect(sidebarQueueUuids.size).toBe(0);
    });

    it("cleans up all queue types on disconnect", () => {
      const port = connectSidebarPort();
      const uuid = "uuid-all-queues";

      sidebarQueueUuids.add(uuid);
      responseQueue.push({
        response: jest.fn(),
        uuid,
        createdAt: Date.now(),
      } as any);
      transactionQueue.push({
        transaction: {} as any,
        uuid,
        createdAt: Date.now(),
      });
      blobQueue.push({ blob: {} as any, uuid, createdAt: Date.now() });
      authEntryQueue.push({
        authEntry: {} as any,
        uuid,
        createdAt: Date.now(),
      });
      tokenQueue.push({ token: {} as any, uuid, createdAt: Date.now() });

      (port as any)._fireDisconnect();
      jest.advanceTimersByTime(500);

      expect(responseQueue).toHaveLength(0);
      expect(transactionQueue).toHaveLength(0);
      expect(blobQueue).toHaveLength(0);
      expect(authEntryQueue).toHaveLength(0);
      expect(tokenQueue).toHaveLength(0);
    });

    it("does not reject popup-originated requests (not in sidebarQueueUuids)", () => {
      const port = connectSidebarPort();
      const mockResponse = jest.fn();

      // UUID is in responseQueue but NOT in sidebarQueueUuids
      activeQueueUuids.add("popup-uuid");
      responseQueue.push({
        response: mockResponse,
        uuid: "popup-uuid",
        createdAt: Date.now(),
      } as any);

      (port as any)._fireDisconnect();
      jest.advanceTimersByTime(500);

      expect(mockResponse).not.toHaveBeenCalled();
      expect(responseQueue).toHaveLength(1);
    });
  });

  describe("reconnect cancels pending cleanup", () => {
    it("cancels rejection when a new port connects before timeout", () => {
      const portA = connectSidebarPort();
      const mockResponse = jest.fn();

      sidebarQueueUuids.add("uuid-1");
      responseQueue.push({
        response: mockResponse,
        uuid: "uuid-1",
        createdAt: Date.now(),
      } as any);

      // Disconnect old port (schedules cleanup)
      (portA as any)._fireDisconnect();

      // New port connects before timeout fires (sidebar reloaded)
      const portB = connectSidebarPort();

      // Advance past the cleanup timeout
      jest.advanceTimersByTime(500);

      // Request should NOT have been rejected
      expect(mockResponse).not.toHaveBeenCalled();
      expect(responseQueue).toHaveLength(1);
      expect(sidebarQueueUuids.has("uuid-1")).toBe(true);
      expect(getSidebarPort()).toBe(portB);
    });

    it("rejects after reconnect if the second port also disconnects", () => {
      const portA = connectSidebarPort();
      const mockResponse = jest.fn();

      sidebarQueueUuids.add("uuid-1");
      responseQueue.push({
        response: mockResponse,
        uuid: "uuid-1",
        createdAt: Date.now(),
      } as any);

      // Disconnect portA
      (portA as any)._fireDisconnect();

      // Reconnect portB (cancels portA's cleanup)
      const portB = connectSidebarPort();

      // Advance past portA's cleanup — should be cancelled
      jest.advanceTimersByTime(500);
      expect(mockResponse).not.toHaveBeenCalled();

      // Now portB disconnects too (sidebar actually closed)
      (portB as any)._fireDisconnect();
      jest.advanceTimersByTime(500);

      expect(mockResponse).toHaveBeenCalledWith(undefined);
      expect(responseQueue).toHaveLength(0);
      expect(sidebarQueueUuids.size).toBe(0);
    });

    it("stale port disconnect does not clear a newer port's state", () => {
      const portA = connectSidebarPort();
      setSidebarPort(portA as any);

      // New port connects (simulates sidebar reload)
      const portB = connectSidebarPort();

      // portA's disconnect fires late
      (portA as any)._fireDisconnect();

      // portB should still be the active port
      expect(getSidebarPort()).toBe(portB);
    });
  });
});

describe("MARK_QUEUE_ACTIVE with sidebarQueueUuids", () => {
  const {
    popupMessageListener,
  } = require("background/messageListener/popupMessageListener");

  const mockSessionStore = {
    getState: jest.fn().mockReturnValue({ session: { publicKey: "" } }),
  } as any;
  const mockLocalStore = {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn(),
  } as any;
  const mockKeyManager = {} as any;
  const mockSessionTimer = {} as any;

  beforeEach(() => {
    clearSidebarPort();
    sidebarQueueUuids.clear();
    activeQueueUuids.clear();
  });

  afterEach(() => {
    clearSidebarPort();
    sidebarQueueUuids.clear();
    activeQueueUuids.clear();
  });

  it("adds to both activeQueueUuids and sidebarQueueUuids when sidebar port is connected", async () => {
    const mockPort = { postMessage: jest.fn(), disconnect: jest.fn() } as any;
    setSidebarPort(mockPort);

    await popupMessageListener(
      { type: "MARK_QUEUE_ACTIVE", uuid: "test-uuid", isActive: true } as any,
      mockSessionStore,
      mockLocalStore,
      mockKeyManager,
      mockSessionTimer,
    );

    expect(activeQueueUuids.has("test-uuid")).toBe(true);
    expect(sidebarQueueUuids.has("test-uuid")).toBe(true);
  });

  it("adds to activeQueueUuids only when no sidebar port is connected", async () => {
    await popupMessageListener(
      { type: "MARK_QUEUE_ACTIVE", uuid: "test-uuid", isActive: true } as any,
      mockSessionStore,
      mockLocalStore,
      mockKeyManager,
      mockSessionTimer,
    );

    expect(activeQueueUuids.has("test-uuid")).toBe(true);
    expect(sidebarQueueUuids.has("test-uuid")).toBe(false);
  });

  it("removes from both sets when isActive is false", async () => {
    activeQueueUuids.add("test-uuid");
    sidebarQueueUuids.add("test-uuid");

    await popupMessageListener(
      { type: "MARK_QUEUE_ACTIVE", uuid: "test-uuid", isActive: false } as any,
      mockSessionStore,
      mockLocalStore,
      mockKeyManager,
      mockSessionTimer,
    );

    expect(activeQueueUuids.has("test-uuid")).toBe(false);
    expect(sidebarQueueUuids.has("test-uuid")).toBe(false);
  });

  it("removes from sidebarQueueUuids even if sidebar port is no longer connected", async () => {
    sidebarQueueUuids.add("test-uuid");
    activeQueueUuids.add("test-uuid");

    // No sidebar port connected
    await popupMessageListener(
      { type: "MARK_QUEUE_ACTIVE", uuid: "test-uuid", isActive: false } as any,
      mockSessionStore,
      mockLocalStore,
      mockKeyManager,
      mockSessionTimer,
    );

    expect(sidebarQueueUuids.has("test-uuid")).toBe(false);
  });
});
