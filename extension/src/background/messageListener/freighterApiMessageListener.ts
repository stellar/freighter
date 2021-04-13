import StellarSdk from "stellar-sdk";
import { browser, Runtime } from "webextension-polyfill-ts";

import { ExternalRequest as Request } from "@shared/api/types";
import { MessageResponder } from "background/types";
import { FlaggedKeys, TransactionInfo } from "types/transactions";

import { EXTERNAL_SERVICE_TYPES } from "@shared/constants/services";
import {
  getNetworkDetails,
  MAINNET_NETWORK_DETAILS,
} from "@shared/helpers/stellar";
import { STELLAR_DIRECTORY_URL } from "background/constants/apiUrls";
import { POPUP_WIDTH } from "constants/dimensions";
import { ALLOWLIST_ID } from "constants/localStorageTypes";
import { TRANSACTION_WARNING } from "constants/transaction";

import {
  getIsTestnet,
  getIsMemoValidationEnabled,
  getIsSafetyValidationEnabled,
} from "background/helpers/account";
import { isSenderAllowed } from "background/helpers/allowListAuthorization";
import { cachedFetch } from "background/helpers/cachedFetch";
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
    const publicKey = publicKeySelector(store.getState());

    const { tab, url: tabUrl = "" } = sender;

    if (isSenderAllowed({ sender }) && publicKey) {
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

  const submitTransaction = async () => {
    const {
      transactionXdr,
      network = MAINNET_NETWORK_DETAILS.network,
    } = request;
    const { networkUrl } = getNetworkDetails(getIsTestnet());
    const transaction = StellarSdk.TransactionBuilder.fromXDR(
      transactionXdr,
      StellarSdk.Networks[network],
    );

    const { tab, url: tabUrl = "" } = sender;
    const domain = getUrlHostname(tabUrl);
    const punycodedDomain = getPunycodedDomain(domain);

    const allowListStr = localStorage.getItem(ALLOWLIST_ID) || "";
    const allowList = allowListStr.split(",");

    const isDomainListedAllowed = isSenderAllowed({ sender });

    const directoryLookupJson = await cachedFetch(STELLAR_DIRECTORY_URL);
    const accountData = directoryLookupJson?._embedded?.records || [];

    const { _operations } = transaction;

    const flaggedKeys: FlaggedKeys = {};

    const isValidatingMemo = getIsMemoValidationEnabled();
    const isValidatingSafety = getIsSafetyValidationEnabled();

    if (isValidatingMemo || isValidatingSafety) {
      _operations.forEach((operation: { destination: string }) => {
        accountData.forEach(
          ({ address, tags }: { address: string; tags: Array<string> }) => {
            if (address === operation.destination) {
              const collectedTags = [...tags];

              /* if the user has opted out of validation, remove applicable tags */
              if (!isValidatingMemo) {
                collectedTags.filter(
                  (tag) => tag !== TRANSACTION_WARNING.memoRequired,
                );
              }
              if (!isValidatingSafety) {
                collectedTags.filter(
                  (tag) => tag !== TRANSACTION_WARNING.unsafe,
                );
                collectedTags.filter(
                  (tag) => tag !== TRANSACTION_WARNING.malicious,
                );
              }
              flaggedKeys[operation.destination] = {
                ...flaggedKeys[operation.destination],
                tags: collectedTags,
              };
            }
          },
        );
      });
    }

    const server = new StellarSdk.Server(networkUrl);
    try {
      await server.checkMemoRequired(transaction);
    } catch (e) {
      flaggedKeys[e.accountId] = {
        ...flaggedKeys[e.accountId],
        tags: [TRANSACTION_WARNING.memoRequired],
      };
    }

    const transactionInfo = {
      transaction,
      tab,
      isDomainListedAllowed,
      url: tabUrl,
      flaggedKeys,
    } as TransactionInfo;

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

  const requestNetwork = () => {
    let network = "";

    try {
      ({ network } = getNetworkDetails(getIsTestnet()));
    } catch (error) {
      console.error(error);
      return { error };
    }
    return { network };
  };

  const messageResponder: MessageResponder = {
    [EXTERNAL_SERVICE_TYPES.REQUEST_ACCESS]: requestAccess,
    [EXTERNAL_SERVICE_TYPES.SUBMIT_TRANSACTION]: submitTransaction,
    [EXTERNAL_SERVICE_TYPES.REQUEST_NETWORK]: requestNetwork,
  };

  return messageResponder[request.type]();
};
