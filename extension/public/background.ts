import { initMessageListener } from "../src/background";

chrome.runtime.onMessage.addListener((message) => {
  if (message === "runContentScript") {
    chrome.tabs.executeScript({
      file: "contentScript.min.js",
    });
  }
});

initMessageListener();
