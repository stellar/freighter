import internalMessageListener from "./messageListener/internalMessageListener";
import externalMessageListener from "./messageListener/externalMessageListener";

const initMessageListener = () => {
  // returning true is very important in these message listeners. It tells the listener that the callback
  // could possibly be async, so keep the channel open til we send a reponse.
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    internalMessageListener(request, sender, sendResponse);
    return true;
  });

  chrome.runtime.onMessageExternal.addListener(
    (request, sender, sendResponse) => {
      externalMessageListener(request, sender, sendResponse);

      // TODO: this is here for dev purposes, need to find better solution
      internalMessageListener(request, sender, sendResponse);
      return true;
    },
  );
};

export default initMessageListener;
