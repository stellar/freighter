/* eslint-disable */

import browser from "webextension-polyfill";
import { ROUTES } from "popup/constants/routes";
import {
  EXTERNAL_SERVICE_TYPES,
  SERVICE_TYPES,
} from "@shared/constants/services";
import { ExternalRequest, Response } from "@shared/api/types";
import { buildStore } from "background/store";

import { popupMessageListener } from "./messageListener/popupMessageListener";
import { freighterApiMessageListener } from "./messageListener/freighterApiMessageListener";
import { SESSION_ALARM_NAME } from "./helpers/session";
import { timeoutAccountAccess } from "./ducks/session";
import {
  migrateFriendBotUrlNetworkDetails,
  normalizeMigratedData,
  migrateSorobanRpcUrlNetworkDetails,
  versionedMigration,
} from "./helpers/dataStorage";

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

export const initExtensionMessageListener = () => {
  browser?.runtime?.onMessage?.addListener(async (request, sender) => {
    const sessionStore = await buildStore();
    // todo this is kinda ugly
    const req = request as ExternalRequest | Response;
    let res;

    if (Object.values(SERVICE_TYPES).includes(req.type as SERVICE_TYPES)) {
      // eslint-disable-next-line
      res = await popupMessageListener(req as Response, sessionStore);
    }
    if (
      Object.values(EXTERNAL_SERVICE_TYPES).includes(
        req.type as EXTERNAL_SERVICE_TYPES,
      )
    ) {
      // eslint-disable-next-line
      res = await freighterApiMessageListener(
        req as ExternalRequest,
        sender,
        sessionStore,
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

export const initAlarmListener = () => {
  browser?.alarms?.onAlarm.addListener(async ({ name }: { name: string }) => {
    const sessionStore = await buildStore();
    if (name === SESSION_ALARM_NAME) {
      sessionStore.dispatch(timeoutAccountAccess());
    }
  });
};
