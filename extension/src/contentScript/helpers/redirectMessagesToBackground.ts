import browser from "webextension-polyfill";
import {
  DEV_EXTENSION,
  EXTERNAL_MSG_REQUEST,
  EXTERNAL_MSG_RESPONSE,
  EXTERNAL_SERVICE_TYPES,
} from "@shared/constants/services";

export const redirectMessagesToBackground = () => {
  window.addEventListener(
    "message",
    async (event) => {
      const messagedId = event?.data?.messageId || 0;
      // We only accept messages from ourselves
      if (event.source !== window) {
        return;
      }

      // only allow external Freighter API calls unless we're in Dev Mode
      if (
        !Object.keys(EXTERNAL_SERVICE_TYPES).includes(
          event.data.type as string,
        ) &&
        !DEV_EXTENSION
      ) {
        return;
      }
      // Only respond to messages tagged as being from Freighter API
      if (!event.data.source || event.data.source !== EXTERNAL_MSG_REQUEST) {
        return;
      }
      // Forward the message on to Background
      let res: any = { error: "Unable to send message to extension" };
      try {
        console.log(
          "[redirectMessagesToBackground] Forwarding message to background:",
          event.data,
        );
        res = await browser.runtime.sendMessage(event.data);
        console.log("[redirectMessagesToBackground] Background response:", res);
        console.log(
          "[redirectMessagesToBackground] Background response type:",
          typeof res,
        );
        console.log(
          "[redirectMessagesToBackground] Background response keys:",
          res ? Object.keys(res) : "null/undefined",
        );
      } catch (e) {
        console.error("[redirectMessagesToBackground] Error:", e);
      }
      // Send the response back to Freighter API
      // If res is undefined, use empty object to avoid losing the response structure
      const responseToSend = {
        source: EXTERNAL_MSG_RESPONSE,
        messagedId,
        ...(res || {}),
      };
      console.log(
        "[redirectMessagesToBackground] Sending response:",
        responseToSend,
      );
      console.log(
        "[redirectMessagesToBackground] Response keys:",
        Object.keys(responseToSend),
      );
      window.postMessage(responseToSend, window.location.origin);
    },
    false,
  );
};
