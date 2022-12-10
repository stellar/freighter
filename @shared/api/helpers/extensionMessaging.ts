import browser from "webextension-polyfill";
import {
  DEV_SERVER,
  EXTERNAL_MSG_RESPONSE,
  EXTERNAL_MSG_REQUEST,
} from "../../constants/services";
import { Response } from "../types";

export const sendMessageToContentScript = (msg: {}): Promise<Response> => {
  /* 
    In the case of multiple calls coming in sequentially, we use this MESSAGE_ID to make sure we're responding to
    the appropriate message sender. Otherwise, we can run into race conditions where we simply resolve all 
    sent messages with the first thing that comes back.
  */
  const MESSAGE_ID = Date.now() + Math.random();

  window.postMessage(
    { source: EXTERNAL_MSG_REQUEST, messageId: MESSAGE_ID, ...msg },
    window.location.origin,
  );
  return new Promise((resolve) => {
    const messageListener = (event: { source: any; data: Response }) => {
      // We only accept messages from ourselves
      if (event.source !== window) return;
      // Only respond to messages tagged as being from our content script
      if (event?.data?.source !== EXTERNAL_MSG_RESPONSE) return;
      // Only respond to messages that this instance of sendMessageToContentScript sent
      if (event?.data?.messagedId !== MESSAGE_ID) return;

      resolve(event.data);
      window.removeEventListener("message", messageListener);
    };
    window.addEventListener("message", messageListener, false);
  });
};

export const sendMessageToBackground = async (msg: {}): Promise<Response> => {
  let res;
  if (DEV_SERVER) {
    // treat this as an external call because we're making the call from the browser, not the popup
    res = await sendMessageToContentScript(msg);
  } else {
    res = await browser?.runtime.sendMessage(msg);
  }

  return res;
};
