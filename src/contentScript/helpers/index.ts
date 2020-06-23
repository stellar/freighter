import { sendMessageToBackground } from "api/helpers";
import { EXTERNAL_MSG_REQUEST, EXTERNAL_MSG_RESPONSE } from "statics";

export const embedLyraApi = () => {
  const url = chrome.extension.getURL("lyraApi.min.js");
  const script = document.createElement("script");
  script.src = url;
  const parentNode = document.head || document.documentElement;
  parentNode.prepend(script);
  script.onload = () => {
    parentNode.removeChild(script);
  };
};

export const redirectMessagesToBackground = () => {
  window.addEventListener(
    "message",
    async (event) => {
      // We only accept messages from ourselves
      if (event.source !== window) return;
      // Only respond to messages tagged as being from Lyra API
      if (!event.data.source || event.data.source !== EXTERNAL_MSG_REQUEST)
        return;
      // Forward the message on to Background
      let res = { error: "Unable to send message to extension" };
      try {
        res = await sendMessageToBackground(event.data);
      } catch (e) {
        console.error(e);
      }
      // Send the response back to Lyra API
      window.postMessage(
        { source: EXTERNAL_MSG_RESPONSE, ...res },
        window.location.origin,
      );
    },
    false,
  );
};
