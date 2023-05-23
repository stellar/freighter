import browser from "webextension-polyfill";
import { Store } from "redux";
import { ROUTES } from "popup/constants/routes";
import {
  EXTERNAL_SERVICE_TYPES,
  SERVICE_TYPES,
} from "@shared/constants/services";

import { popupMessageListener } from "./messageListener/popupMessageListener";
import { freighterApiMessageListener } from "./messageListener/freighterApiMessageListener";
import { SESSION_ALARM_NAME } from "./helpers/session";
import { timeoutAccountAccess } from "./ducks/session";
import {
  migrateFriendBotUrlNetworkDetails,
  normalizeMigratedData,
} from "./helpers/dataStorage";

export const initContentScriptMessageListener = () => {
  browser?.runtime?.onMessage?.addListener((message) => {
    if (message === "runContentScript") {
      browser.tabs.executeScript({
        file: "contentScript.min.js",
      });
    }
  });
};

export const initExtensionMessageListener = (sessionStore: Store) => {
  browser?.runtime?.onMessage?.addListener(async (request, sender) => {
    // todo this is kinda ugly
    let res;
    if (Object.values(SERVICE_TYPES).includes(request.type)) {
      res = await popupMessageListener(request, sessionStore);
    }
    if (Object.values(EXTERNAL_SERVICE_TYPES).includes(request.type)) {
      res = await freighterApiMessageListener(request, sender, sessionStore);
    }

    return res;
  });
};

export const initInstalledListener = () => {
  browser?.runtime?.onInstalled.addListener(async ({ reason, temporary }) => {
    if (temporary) return; // skip during development
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
};

export const initAlarmListener = (sessionStore: Store) => {
  browser?.alarms?.onAlarm.addListener(({ name }: { name: string }) => {
    if (name === SESSION_ALARM_NAME) {
      sessionStore.dispatch(timeoutAccountAccess());
    }
  });
};
