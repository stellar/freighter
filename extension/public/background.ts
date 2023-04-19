import { initMessageListener } from "background";
import { browser } from "webextension-polyfill-ts";
import { ROUTES } from "popup/constants/routes";

browser.runtime.onMessage.addListener((message) => {
  if (message === "runContentScript") {
    browser.tabs.executeScript({
      file: "contentScript.min.js",
    });
  }
});

initMessageListener();

browser.runtime.onInstalled.addListener(async ({ reason, temporary }) => {
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
