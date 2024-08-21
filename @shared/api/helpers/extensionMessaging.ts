import browser from "webextension-polyfill";
import {
  DEV_SERVER,
  EXTERNAL_MSG_RESPONSE,
  EXTERNAL_MSG_REQUEST,
  EXTERNAL_SERVICE_TYPES,
  SERVICE_TYPES,
} from "../../constants/services";
import { Response } from "../types";

interface Msg {
  [key: string]: any;
  type: EXTERNAL_SERVICE_TYPES | SERVICE_TYPES;
}

export const sendMessageToContentScript = (msg: Msg): Promise<Response> => {
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
    let requestTimeout = 0 as any;

    /* 
      In the case that Freighter is not installed at all, any messages to 
      background from freighter-api will hang forever and not respond in any way. 
      This is especially a problem for the isConnected method, because this is 
      likely to be called in a situation where Freighter isn't installed.
      To prevent this, we add a timeout to automatically resolve in the event 
      Freighter doesn't respond in a timely fashion to this method.
    */
    if (
      msg.type === EXTERNAL_SERVICE_TYPES.REQUEST_CONNECTION_STATUS ||
      msg.type === EXTERNAL_SERVICE_TYPES.REQUEST_PUBLIC_KEY
    ) {
      requestTimeout = setTimeout(() => {
        resolve({
          isConnected: false,
          publicKey: "",
        } as Response);
        window.removeEventListener("message", messageListener);
      }, 2000);
    }

    const messageListener = (event: { source: any; data: Response }) => {
      // We only accept messages from ourselves
      if (event.source !== window) return;
      // Only respond to messages tagged as being from our content script
      if (event?.data?.source !== EXTERNAL_MSG_RESPONSE) return;
      // Only respond to messages that this instance of sendMessageToContentScript sent
      if (event?.data?.messagedId !== MESSAGE_ID) return;

      resolve(event.data);
      window.removeEventListener("message", messageListener);
      clearTimeout(requestTimeout);
    };
    window.addEventListener("message", messageListener, false);
  });
};

export const sendMessageToBackground = async (msg: Msg): Promise<Response> => {
  let res;
  if (DEV_SERVER) {
    // treat this as an external call because we're making the call from the browser, not the popup
    res = await sendMessageToContentScript(msg);
  } else {
    res = await browser.runtime.sendMessage(msg);
  }

  return res as Response;
};

export const FreighterApiNodeError = {
  code: -1,
  message: "Node environment is not supported",
};

export const FreighterApiInternalError = {
  code: -1,
  message:
    "The wallet encountered an internal error. Please try again or contact the wallet if the problem persists.",
};

export const FreighterApiDeclinedError = {
  code: -4,
  message: "The user rejected this request.",
};
