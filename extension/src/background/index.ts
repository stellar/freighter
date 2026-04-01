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
} from "./messageListener/freighterApiMessageListener";
import { freighterApiMessageListener } from "./messageListener/freighterApiMessageListener";
import { SIDEBAR_PORT_NAME } from "popup/components/SidebarSigningListener";
import { activeQueueUuids } from "./helpers/queueCleanup";
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
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== SIDEBAR_PORT_NAME) return;

    // Reject connections from content scripts; only extension pages are trusted.
    // Extension pages have no associated tab and load from the extension origin.
    const isExtensionPage =
      !port.sender?.tab &&
      port.sender?.url?.startsWith(browser.runtime.getURL(""));
    if (!isExtensionPage) {
      port.disconnect();
      return;
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

    // When sidebar closes (for any reason), clear the window ID
    // and reject any pending signing requests
    port.onDisconnect.addListener(() => {
      clearSidebarPort();
      clearSidebarWindowId();

      // Reject all active signing requests that were open in the sidebar
      for (const uuid of activeQueueUuids) {
        const responseIndex = responseQueue.findIndex(
          (item) => item.uuid === uuid,
        );
        if (responseIndex !== -1) {
          const responseQueueItem = responseQueue.splice(responseIndex, 1)[0];
          responseQueueItem.response(undefined);
        }

        // Clean up the data queues
        const txIndex = transactionQueue.findIndex(
          (item) => item.uuid === uuid,
        );
        if (txIndex !== -1) transactionQueue.splice(txIndex, 1);

        const blobIndex = blobQueue.findIndex((item) => item.uuid === uuid);
        if (blobIndex !== -1) blobQueue.splice(blobIndex, 1);

        const authIndex = authEntryQueue.findIndex(
          (item) => item.uuid === uuid,
        );
        if (authIndex !== -1) authEntryQueue.splice(authIndex, 1);

        const tokenIndex = tokenQueue.findIndex((item) => item.uuid === uuid);
        if (tokenIndex !== -1) tokenQueue.splice(tokenIndex, 1);
      }
      activeQueueUuids.clear();
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
