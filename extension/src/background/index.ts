import { popupMessageListener } from "./messageListener/popupMessageListener";
import { freighterApiMessageListener } from "./messageListener/freighterApiMessageListener";

export const initMessageListener = () => {
  // returning true is very important in these message listeners. It tells the listener that the callback
  // could possibly be async, so keep the channel open til we send a reponse.
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    popupMessageListener(request, sender, sendResponse);
    freighterApiMessageListener(request, sender, sendResponse);

    return true;
  });
};
