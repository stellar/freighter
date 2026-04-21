import browser from "webextension-polyfill";
import { ROUTES } from "popup/constants/routes";
import {
  EXTERNAL_SERVICE_TYPES,
  SERVICE_TYPES,
} from "@shared/constants/services";
import { ExternalRequest, Response } from "@shared/api/types";
import { buildStore } from "background/store";

import {
  popupMessageListener,
  clearSidebarWindowId,
  setSidebarWindowId,
  responseQueue,
  transactionQueue,
  blobQueue,
  authEntryQueue,
  tokenQueue,
} from "./messageListener/popupMessageListener";
import {
  setSidebarPort,
  clearSidebarPort,
  getSidebarPort,
} from "./helpers/sidebarPort";
import { freighterApiMessageListener } from "./messageListener/freighterApiMessageListener";
import { SIDEBAR_PORT_NAME } from "popup/components/SidebarSigningListener";
import {
  sidebarQueueUuids,
  SIDEBAR_DISCONNECT_DEBOUNCE_MS,
} from "./helpers/queueCleanup";
import { removeUuidFromAllQueues } from "./messageListener/handlers/rejectSigningRequest";
import {
  SESSION_ALARM_NAME,
  SessionTimer,
  clearSession,
} from "./helpers/session";
import {
  migrateFriendBotUrlNetworkDetails,
  normalizeMigratedData,
  migrateSorobanRpcUrlNetworkDetails,
  versionedMigration,
} from "./helpers/dataStorage";
import {
  dataStorageAccess,
  browserLocalStorage,
} from "./helpers/dataStorageAccess";
import { IS_OPEN_SIDEBAR_BY_DEFAULT_ID } from "constants/localStorageTypes";
import { ServiceMessageRequest } from "@shared/api/types/message-request";
import {
  BrowserStorageKeyStore,
  KeyManager,
  ScryptEncrypter,
} from "@stellar/typescript-wallet-sdk-km";
import { BrowserStorageConfigParams } from "@stellar/typescript-wallet-sdk-km/lib/Plugins/BrowserStorageFacade";

const sessionTimer = new SessionTimer();

export const initContentScriptMessageListener = () => {
  browser?.runtime?.onMessage?.addListener((message) => {
    if (message === "runContentScript") {
      browser.tabs.executeScript({
        file: "contentScript.min.js",
      });
    }
    return undefined;
  });
};

export const initSidebarConnectionListener = () => {
  // Pending cleanup scheduled when a sidebar port disconnects.
  // Cancelled if a new port connects before it fires (sidebar reloaded
  // rather than closed, e.g. from chrome.sidePanel.open()).
  let pendingCleanup: ReturnType<typeof setTimeout> | null = null;

  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== SIDEBAR_PORT_NAME) return;

    // Reject connections from content scripts; only extension pages are trusted.
    // Extension pages have no associated tab and load from the extension origin.
    const isExtensionPage =
      !port.sender?.tab &&
      port.sender?.id === browser.runtime.id &&
      port.sender?.url?.startsWith(browser.runtime.getURL(""));
    if (!isExtensionPage) {
      port.disconnect();
      return;
    }

    // A new sidebar connected — cancel any pending cleanup from a
    // previous port disconnect so in-flight requests stay alive.
    if (pendingCleanup !== null) {
      clearTimeout(pendingCleanup);
      pendingCleanup = null;
    }

    // Store port reference so openSigningWindow can send messages directly
    setSidebarPort(port);

    // Sidebar sends its window ID as first message
    port.onMessage.addListener((msg: unknown) => {
      if (
        typeof msg === "object" &&
        msg !== null &&
        "windowId" in msg &&
        typeof (msg as { windowId?: unknown }).windowId === "number"
      ) {
        setSidebarWindowId((msg as { windowId: number }).windowId);
      }
    });

    // When sidebar closes, clear port state and schedule cleanup.
    // The cleanup is deferred because chrome.sidePanel.open() can
    // reload the sidebar page, causing a brief disconnect/reconnect.
    // Only schedule cleanup when the disconnecting port is the currently
    // active sidebar port — a stale port disconnecting should not trigger
    // cleanup while a newer port is still connected.
    port.onDisconnect.addListener(() => {
      if (getSidebarPort() !== port) {
        return;
      }

      clearSidebarPort();
      clearSidebarWindowId();

      pendingCleanup = setTimeout(() => {
        pendingCleanup = null;

        // Reject only the signing requests that were routed to the sidebar.
        // Requests handled by standalone popup windows have their own
        // onWindowRemoved listeners and must not be cancelled here.
        for (const uuid of sidebarQueueUuids) {
          removeUuidFromAllQueues(uuid, {
            responseQueue,
            transactionQueue,
            blobQueue,
            authEntryQueue,
            tokenQueue,
          });
        }
        sidebarQueueUuids.clear();
      }, SIDEBAR_DISCONNECT_DEBOUNCE_MS);
    });
  });
};

export const initExtensionMessageListener = () => {
  browser?.runtime?.onMessage?.addListener(async (request, sender) => {
    const sessionStore = await buildStore();
    const localStore = dataStorageAccess(browserLocalStorage);
    const localKeyStore = new BrowserStorageKeyStore();
    localKeyStore.configure({
      storage: browserLocalStorage as BrowserStorageConfigParams["storage"],
    });
    const keyManager = new KeyManager({
      keyStore: localKeyStore,
    });
    keyManager.registerEncrypter(ScryptEncrypter);
    // todo this is kinda ugly
    const req = request as ExternalRequest | Response;
    let res;

    if (Object.values(SERVICE_TYPES).includes(req.type as SERVICE_TYPES)) {
      res = await popupMessageListener(
        req as ServiceMessageRequest,
        sessionStore,
        localStore,
        keyManager,
        sessionTimer,
        sender,
      );
    }
    if (
      Object.values(EXTERNAL_SERVICE_TYPES).includes(
        req.type as EXTERNAL_SERVICE_TYPES,
      )
    ) {
      res = await freighterApiMessageListener(
        req as ExternalRequest,
        sender,
        sessionStore,
        localStore,
      );
    }

    return res;
  });
};

export const initInstalledListener = () => {
  browser?.runtime?.onInstalled.addListener(async ({ reason, temporary }) => {
    if (temporary) {
      return; // skip during development
    }
    switch (reason) {
      case "install":
        await browser.tabs.create({
          url: browser.runtime.getURL(`index.html#${ROUTES.welcome}`),
        });
        break;
      // TODO: case "update":
      // TODO: case "browser_update":
      default:
    }
  });
  browser?.runtime?.onInstalled.addListener(normalizeMigratedData);
  browser?.runtime?.onInstalled.addListener(migrateFriendBotUrlNetworkDetails);
  browser?.runtime?.onInstalled.addListener(migrateSorobanRpcUrlNetworkDetails);
  browser?.runtime?.onInstalled.addListener(versionedMigration);
};

export const initSidebarBehavior = async () => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const val =
    ((await localStore.getItem(IS_OPEN_SIDEBAR_BY_DEFAULT_ID)) as boolean) ??
    false;
  if (chrome.sidePanel?.setPanelBehavior) {
    // Chrome: delegate action-click to the side panel when enabled
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: val })
      .catch((e) => console.error("Failed to set panel behavior:", e));
  }
  // Firefox does not support "open sidebar by default" — sidebarAction.open()
  // requires a synchronous user gesture and there is no setPanelBehavior equivalent.
  // Users can still open the sidebar manually via the AccountHeader menu.
};

export const initAlarmListener = () => {
  browser?.alarms?.onAlarm.addListener(async ({ name }: { name: string }) => {
    const sessionStore = await buildStore();
    const localStore = dataStorageAccess(browserLocalStorage);

    if (name === SESSION_ALARM_NAME) {
      await clearSession({ sessionStore, localStore });
    }
  });
};
