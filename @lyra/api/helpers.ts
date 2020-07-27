import {
  DEVELOPMENT,
  EXTERNAL_MSG_REQUEST,
  EXTERNAL_MSG_RESPONSE,
} from "@lyra/constants/services";
import { Response } from "./types";

export const sendMessageToContentScript = (msg: {}): Promise<Response> => {
  window.postMessage(
    { source: EXTERNAL_MSG_REQUEST, ...msg },
    window.location.origin,
  );
  return new Promise((resolve) => {
    const messageListener = (event: { source: any; data: Response }) => {
      // We only accept messages from ourselves
      if (event.source !== window) return;
      // Only respond to messages tagged as being from our content script
      if (!event.data.source || event.data.source !== EXTERNAL_MSG_RESPONSE) {
        return;
      }
      resolve(event.data);
      window.removeEventListener("message", messageListener);
    };
    window.addEventListener("message", messageListener, false);
  });
};

export const sendMessageToBackground = (msg: {}): Promise<Response> => {
  if (DEVELOPMENT) {
    // treat this as an external call because we're making the call from the browser, not the popup
    return sendMessageToContentScript(msg);
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (res: Response) => resolve(res));
  });
};
