import StellarSdk from "stellar-sdk";
import { browser, Runtime } from "webextension-polyfill-ts";

import { ExternalRequest as Request } from "@shared/api/types";
import { MessageResponder } from "background/types";

import { EXTERNAL_SERVICE_TYPES } from "@shared/constants/services";
import { NETWORK } from "@shared/constants/stellar";

import { POPUP_WIDTH } from "constants/dimensions";
import { ALLOWLIST_ID } from "constants/localStorageTypes";

import { getUrlHostname, getPunycodedDomain } from "helpers/urls";

import { store } from "background/store";
import { publicKeySelector } from "background/ducks/session";

import { responseQueue, transactionQueue } from "./popupMessageListener";

interface WINDOW_PARAMS {
  height: number;
  type: "popup";
  width: number;
}

const WINDOW_SETTINGS: WINDOW_PARAMS = {
  type: "popup",
  width: POPUP_WIDTH,
  height: 667,
};

export const freighterApiMessageListener = (
  request: Request,
  sender: Runtime.MessageSender,
) => {
  const requestAccess = () => {
    // TODO: add check to make sure this origin is on allowlist
    const allowListStr = localStorage.getItem(ALLOWLIST_ID) || "";
    const allowList = allowListStr.split(",");
    const publicKey = publicKeySelector(store.getState());

    const { tab, url: tabUrl = "" } = sender;
    const domain = getUrlHostname(tabUrl);

    if (allowList.includes(getPunycodedDomain(domain)) && publicKey) {
      // okay, the requester checks out and we have public key, send it
      return { publicKey };
    }

    // otherwise, we need to confirm either url or password. Maybe both
    const encodeOrigin = btoa(JSON.stringify({ tab, url: tabUrl }));
    browser.windows.create({
      url: chrome.runtime.getURL(`/index.html#/grant-access?${encodeOrigin}`),
      ...WINDOW_SETTINGS,
    });

    return new Promise((resolve) => {
      const response = (url?: string) => {
        // queue it up, we'll let user confirm the url looks okay and then we'll send publicKey
        // if we're good, of course
        if (url === tabUrl) {
          resolve({ publicKey: publicKeySelector(store.getState()) });
        }

        resolve({ error: "User declined access" });
      };

      responseQueue.push(response);
    });
  };

  const submitTransaction = () => {
    const { transactionXdr } = request;
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      transactionXdr,
      StellarSdk.Networks[NETWORK],
    );

    const { tab, url: tabUrl = "" } = sender;
    const domain = getUrlHostname(tabUrl);
    const punycodedDomain = getPunycodedDomain(domain);

    const allowListStr = localStorage.getItem(ALLOWLIST_ID) || "";
    const allowList = allowListStr.split(",");

    const isDomainListedAllowed = allowList.includes(punycodedDomain);

    const transactionInfo = {
      transaction,
      tab,
      isDomainListedAllowed,
      url: tabUrl,
    };

    transactionQueue.push(transaction);

    const encodetransactionInfo = btoa(JSON.stringify(transactionInfo));

    const popup = browser.windows.create({
      url: chrome.runtime.getURL(
        `/index.html#/sign-transaction?${encodetransactionInfo}`,
      ),
      ...WINDOW_SETTINGS,
    });

    return new Promise((resolve) => {
      if (!popup) {
        resolve({ error: "Couldn't open access prompt" });
      } else {
        browser.windows.onRemoved.addListener(() =>
          resolve({
            error: "User declined access",
          }),
        );
      }
      const response = (signedTransaction: string) => {
        if (signedTransaction) {
          if (!isDomainListedAllowed) {
            allowList.push(punycodedDomain);
            localStorage.setItem(ALLOWLIST_ID, allowList.join());
          }
          resolve({ signedTransaction });
        }

        resolve({ error: "User declined access" });
      };

      responseQueue.push(response);
    });
  };

  const messageResponder: MessageResponder = {
    [EXTERNAL_SERVICE_TYPES.REQUEST_ACCESS]: requestAccess,
    [EXTERNAL_SERVICE_TYPES.SUBMIT_TRANSACTION]: submitTransaction,
  };

  return messageResponder[request.type]();
};
