import browser from "webextension-polyfill";
import { ROUTES } from "popup/constants/routes";
import {
  EXTERNAL_SERVICE_TYPES,
  SERVICE_TYPES,
} from "@shared/constants/services";

import { popupMessageListener } from "./messageListener/popupMessageListener";
import { freighterApiMessageListener } from "./messageListener/freighterApiMessageListener";
import { SESSION_ALARM_NAME } from "./helpers/session";
import { buildStore } from "./store";
// import { timeoutAccountAccess } from "./ducks/session";

export const initContentScriptMessageListener = () => {
  browser?.runtime?.onMessage?.addListener((message) => {
    if (message === "runContentScript") {
      browser.tabs.executeScript({
        file: "contentScript.min.js",
      });
    }
  });
};

export const initExtensionMessageListener = () => {
  browser?.runtime?.onMessage?.addListener(async (request, sender) => {
    // todo this is kinda ugly
    const store = await buildStore();
    console.log(store.getState());
    let res;
    if (Object.values(SERVICE_TYPES).includes(request.type)) {
      res = await popupMessageListener(request, store);
    }
    if (Object.values(EXTERNAL_SERVICE_TYPES).includes(request.type)) {
      res = await freighterApiMessageListener(request, sender, store);
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
};

export const initInitAlarmListener = () => {
  browser?.alarms?.onAlarm.addListener(({ name }: { name: string }) => {
    if (name === SESSION_ALARM_NAME) {
      // timeoutAccountAccess()
    }
  });
};
