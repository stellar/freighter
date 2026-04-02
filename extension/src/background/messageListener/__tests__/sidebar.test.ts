import { SERVICE_TYPES } from "@shared/constants/services";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import {
  setSidebarPort,
  clearSidebarPort,
  getSidebarPort,
} from "background/helpers/sidebarPort";

// Mock chrome.sidePanel API
const mockSetOptions = jest.fn().mockResolvedValue(undefined);
const mockOpen = jest.fn().mockResolvedValue(undefined);

(global as any).chrome = {
  sidePanel: {
    setOptions: mockSetOptions,
    open: mockOpen,
  },
  runtime: { getURL: (path: string) => `chrome-extension://fake-id${path}` },
};

const mockSessionStore = {
  getState: jest.fn().mockReturnValue({ session: { publicKey: "" } }),
} as any;

const mockLocalStore = {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn(),
} as any;

const mockKeyManager = {} as any;
const mockSessionTimer = {} as any;

describe("sidebar message handlers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("OPEN_SIDEBAR", () => {
    const request = {
      type: SERVICE_TYPES.OPEN_SIDEBAR,
      windowId: 42,
    };

    it("returns Unauthorized when sender is a content script (has sender.tab)", async () => {
      const contentScriptSender = { tab: { id: 1 } };
      const result = await popupMessageListener(
        request as any,
        mockSessionStore,
        mockLocalStore,
        mockKeyManager,
        mockSessionTimer,
        contentScriptSender,
      );
      expect(result).toEqual({ error: "Unauthorized" });
      expect(mockSetOptions).not.toHaveBeenCalled();
      expect(mockOpen).not.toHaveBeenCalled();
    });

    it("opens the sidebar when sender is an extension page (no sender.tab)", async () => {
      const extensionPageSender = {};
      const result = await popupMessageListener(
        request as any,
        mockSessionStore,
        mockLocalStore,
        mockKeyManager,
        mockSessionTimer,
        extensionPageSender,
      );
      expect(result).toEqual({});
      expect(mockSetOptions).toHaveBeenCalledWith({
        path: "index.html?mode=sidebar",
        enabled: true,
      });
      expect(mockOpen).toHaveBeenCalledWith({ windowId: 42 });
    });

    it("opens the sidebar when no sender is provided", async () => {
      const result = await popupMessageListener(
        request as any,
        mockSessionStore,
        mockLocalStore,
        mockKeyManager,
        mockSessionTimer,
      );
      expect(result).toEqual({});
      expect(mockSetOptions).toHaveBeenCalled();
      expect(mockOpen).toHaveBeenCalled();
    });
  });

  describe("sidebarWindowId management", () => {
    it("getSidebarWindowId returns null initially", async () => {
      const {
        getSidebarWindowId,
        clearSidebarWindowId,
      } = require("background/messageListener/popupMessageListener");
      clearSidebarWindowId();
      expect(getSidebarWindowId()).toBeNull();
    });

    it("setSidebarWindowId / clearSidebarWindowId work correctly", () => {
      const {
        getSidebarWindowId,
        clearSidebarWindowId,
        setSidebarWindowId,
      } = require("background/messageListener/popupMessageListener");
      setSidebarWindowId(99);
      expect(getSidebarWindowId()).toBe(99);
      clearSidebarWindowId();
      expect(getSidebarWindowId()).toBeNull();
    });
  });

  describe("sidebarPort management", () => {
    afterEach(() => {
      clearSidebarPort();
    });

    it("setSidebarPort stores the port without throwing", () => {
      const mockPort = {
        postMessage: jest.fn(),
        disconnect: jest.fn(),
      } as any;
      expect(() => setSidebarPort(mockPort)).not.toThrow();
    });

    it("clearSidebarPort clears without throwing", () => {
      const mockPort = {
        postMessage: jest.fn(),
        disconnect: jest.fn(),
      } as any;
      setSidebarPort(mockPort);
      expect(() => clearSidebarPort()).not.toThrow();
    });

    it("clearSidebarPort is safe to call when no port is set", () => {
      expect(() => clearSidebarPort()).not.toThrow();
    });

    it("getSidebarPort returns null after clearSidebarPort", () => {
      const mockPort = { postMessage: jest.fn(), disconnect: jest.fn() } as any;
      setSidebarPort(mockPort);
      clearSidebarPort();
      expect(getSidebarPort()).toBeNull();
    });

    it("getSidebarPort returns the currently stored port", () => {
      const mockPort = { postMessage: jest.fn(), disconnect: jest.fn() } as any;
      setSidebarPort(mockPort);
      expect(getSidebarPort()).toBe(mockPort);
    });

    it("an older port disconnecting does not evict a newer sidebar port", () => {
      const portA = { postMessage: jest.fn(), disconnect: jest.fn() } as any;
      const portB = { postMessage: jest.fn(), disconnect: jest.fn() } as any;

      // Connect portA then portB (simulates a second sidebar window opening)
      setSidebarPort(portA);
      setSidebarPort(portB);

      // Simulate portA's disconnect handler: only clear if portA is still the active port
      const disconnectingPort = portA;
      if (getSidebarPort() === disconnectingPort) {
        clearSidebarPort();
      }

      // portA disconnected but portB is still active – must not be cleared
      expect(getSidebarPort()).toBe(portB);
    });
  });
});
