import StellarSdk from "stellar-sdk";

import { ExternalRequest as Request } from "@shared/api/types";
import {
  MessageResponder,
  Sender,
  SendResponseInterface,
} from "background/types";

import { EXTERNAL_SERVICE_TYPES } from "@shared/constants/services";
import { NETWORK } from "@shared/constants/stellar";

import { POPUP_WIDTH } from "constants/dimensions";
import { ALLOWLIST_ID } from "constants/localStorageTypes";

import { getUrlHostname, getPunycodedDomain } from "helpers/urls";

import { store } from "background/store";
import { publicKeySelector } from "background/ducks/session";

import { responseQueue, transactionQueue } from "./popupMessageListener";

const WINDOW_DIMENSIONS = `width=${POPUP_WIDTH},height=667`;

export const freighterApiMessageListener = (
  request: Request,
  sender: Sender,
  sendResponse: (response: SendResponseInterface) => void,
) => {
  const requestAccess = () => {
    // TODO: add check to make sure this origin is on allowlist
    const allowListStr = localStorage.getItem(ALLOWLIST_ID) || "";
    const allowList = allowListStr.split(",");
    const publicKey = publicKeySelector(store.getState());

    const { tab } = sender;
    const tabUrl = tab?.url ? tab.url : "";
    const domain = getUrlHostname(tabUrl);

    if (allowList.includes(getPunycodedDomain(domain))) {
      if (publicKey) {
        // okay, the requester checks out and we have public key, send it
        sendResponse({ publicKey });
        return;
      }
    }

    // otherwise, we need to confirm either url or password. Maybe both
    const encodeOrigin = btoa(JSON.stringify(tab));
    window.open(
      chrome.runtime.getURL(`/index.html#/grant-access?${encodeOrigin}`),
      "Freighter: Connect",
      WINDOW_DIMENSIONS,
    );

    const response = (url?: string) => {
      // queue it up, we'll let user confirm the url looks okay and then we'll send publicKey
      // if we're good, of course
      if (url === tabUrl) {
        sendResponse({ publicKey: publicKeySelector(store.getState()) });
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
      StellarSdk.Networks[NETWORK],
    );

    const { tab } = sender;
    const tabUrl = tab?.url ? tab.url : "";
    const domain = getUrlHostname(tabUrl);
    const punycodedDomain = getPunycodedDomain(domain);

    const allowListStr = localStorage.getItem(ALLOWLIST_ID) || "";
    const allowList = allowListStr.split(",");

    const isDomainListedAllowed = allowList.includes(punycodedDomain);

    const transactionInfo = {
      transaction,
      tab,
      isDomainListedAllowed,
    };

    transactionQueue.push(transaction);

    const encodetransactionInfo = btoa(JSON.stringify(transactionInfo));

    const popup = window.open(
      chrome.runtime.getURL(
        `/index.html#/sign-transaction?${encodetransactionInfo}`,
      ),
      "Freighter: Sign Transaction",
      WINDOW_DIMENSIONS,
    );
    if (!popup) {
      responseQueue.push(() => {
        sendResponse({ error: "Couldn't open access prompt" });
      });
      return;
    }

    const response = (signedTransaction: string) => {
      if (signedTransaction) {
        sendResponse({ signedTransaction });

        if (!isDomainListedAllowed) {
          allowList.push(punycodedDomain);
          localStorage.setItem(ALLOWLIST_ID, allowList.join());
        }
      } else {
        sendResponse({ error: "User declined access" });
      }
    };

    popup.addEventListener("beforeunload", () => {
      sendResponse({ error: "User declined access" });
    });
    responseQueue.push(response);
  };

  const messageResponder: MessageResponder = {
    [EXTERNAL_SERVICE_TYPES.REQUEST_ACCESS]: requestAccess,
    [EXTERNAL_SERVICE_TYPES.SUBMIT_TRANSACTION]: submitTransaction,
  };

  if (messageResponder[request.type]) {
    messageResponder[request.type]();
  }
};
