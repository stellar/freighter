import initMessageListener from "../src/background";

chrome.runtime.onInstalled.addListener(() => {
  chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
    chrome.declarativeContent.onPageChanged.addRules([
      {
        conditions: [
          new chrome.declarativeContent.PageStateMatcher({
            css: ["div"],
          }),
        ],
        actions: [new chrome.declarativeContent.ShowPageAction()],
      },
    ]);
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message === "runContentScript") {
    chrome.tabs.executeScript({
      file: "contentScript.min.js",
    });
  }
});

initMessageListener();
