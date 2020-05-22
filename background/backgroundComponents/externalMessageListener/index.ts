import StellarSdk from "stellar-sdk";

import { ExternalRequest as Request } from "api/types";
import { EXTERNAL_SERVICE_TYPES } from "statics";
import { Sender, SendResponseInterface } from "../types";
import { responseQueue, uiData, transactionQueue } from "../messageListener";

const WHITELIST_ID = "whitelist";
const WINDOW_DIMENSIONS = "height=600,width=357";

export const externalMessageListener = (
  request: Request,
  sender: Sender,
  sendResponse: (response: SendResponseInterface) => void,
) => {
  const requestAccess = () => {
    // TODO: add check to make sure this origin is on whitelist
    const whitelistStr = localStorage.getItem(WHITELIST_ID) || "";
    const whitelist = whitelistStr.split(",");

    const { tab } = sender;
    const tabUrl = tab?.url ? tab.url : "";

    if (whitelist.includes(tabUrl)) {
      if (uiData.publicKey) {
        // okay, the requester checks out and we have public key, send it
        sendResponse({ publicKey: uiData.publicKey });
        return;
      }
    }

    // otherwise, we need to confirm either url or password. Maybe both
    const encodeOrigin = btoa(JSON.stringify(tab));

    window.open(
      chrome.runtime.getURL(`/index.html#/grant-access?${encodeOrigin}`),
      "Lyra: Connect",
      WINDOW_DIMENSIONS,
    );

    const response = (url?: string) => {
      // queue it up, we'll let user confirm the url looks okay and then we'll send publicKey
      // if we're good, of course
      if (url === tabUrl) {
        sendResponse({ publicKey: uiData.publicKey });
      } else {
        sendResponse({ error: "User declined access" });
      }
    };

    responseQueue.push(response);
  };

  const submitTransaction = () => {
    const { transactionXdr } = request;

    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      transactionXdr,
      StellarSdk.Networks.TESTNET,
    );

    const { tab } = sender;

    const transactionInfo = {
      transaction,
      tab,
    };

    transactionQueue.push(transaction);

    const encodetransactionInfo = btoa(JSON.stringify(transactionInfo));

    window.open(
      chrome.runtime.getURL(
        `/index.html#/sign-transaction?${encodetransactionInfo}`,
      ),
      "Lyra: Sign Transaction",
      WINDOW_DIMENSIONS,
    );

    const response = (transactionStatus: string) => {
      if (transactionStatus) {
        sendResponse({ transactionStatus });
      } else {
        sendResponse({ error: "User declined access" });
      }
    };

    responseQueue.push(response);
  };

  const messageResponder = {
    [EXTERNAL_SERVICE_TYPES.REQUEST_ACCESS]: requestAccess,
    [EXTERNAL_SERVICE_TYPES.SUBMIT_TRANSACTION]: submitTransaction,
  };

  if (messageResponder[request.type]) {
    messageResponder[request.type]();
  }
};
