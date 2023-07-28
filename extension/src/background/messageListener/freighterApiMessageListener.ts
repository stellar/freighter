import StellarSdk from "stellar-sdk";
import * as SorobanSdk from "soroban-client";
import browser from "webextension-polyfill";
import { Store } from "redux";

import { ExternalRequest as Request } from "@shared/api/types";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { MessageResponder } from "background/types";
import { FlaggedKeys, TransactionInfo } from "types/transactions";

import { EXTERNAL_SERVICE_TYPES } from "@shared/constants/services";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { STELLAR_EXPERT_BLOCKED_ACCOUNTS_URL } from "background/constants/apiUrls";
import { POPUP_HEIGHT, POPUP_WIDTH } from "constants/dimensions";
import {
  ALLOWLIST_ID,
  CACHED_BLOCKED_ACCOUNTS_ID,
} from "constants/localStorageTypes";
import { TRANSACTION_WARNING } from "constants/transaction";

import {
  getIsMainnet,
  getIsMemoValidationEnabled,
  getIsSafetyValidationEnabled,
  getIsExperimentalModeEnabled,
  getNetworkDetails,
} from "background/helpers/account";
import { isSenderAllowed } from "background/helpers/allowListAuthorization";
import { cachedFetch } from "background/helpers/cachedFetch";
import { encodeObject, getUrlHostname, getPunycodedDomain } from "helpers/urls";
import {
  dataStorageAccess,
  browserLocalStorage,
} from "background/helpers/dataStorage";
import { publicKeySelector } from "background/ducks/session";

import { blobQueue, responseQueue, transactionQueue } from "./popupMessageListener";

const localStore = dataStorageAccess(browserLocalStorage);

interface WINDOW_PARAMS {
  height: number;
  type: "popup";
  width: number;
}

const WINDOW_SETTINGS: WINDOW_PARAMS = {
  type: "popup",
  width: POPUP_WIDTH,
  height: POPUP_HEIGHT + 32, // include browser frame height,
};

export const freighterApiMessageListener = (
  request: Request,
  sender: browser.Runtime.MessageSender,
  sessionStore: Store,
) => {
  const requestAccess = async () => {
    const publicKey = publicKeySelector(sessionStore.getState());

    const { tab, url: tabUrl = "" } = sender;

    if ((await isSenderAllowed({ sender })) && publicKey) {
      // okay, the requester checks out and we have public key, send it
      return { publicKey };
    }

    // otherwise, we need to confirm either url or password. Maybe both
    const encodeOrigin = encodeObject({ tab, url: tabUrl });

    browser.windows.create({
      url: chrome.runtime.getURL(`/index.html#/grant-access?${encodeOrigin}`),
      ...WINDOW_SETTINGS,
    });

    return new Promise((resolve) => {
      const response = (url?: string) => {
        // queue it up, we'll let user confirm the url looks okay and then we'll send publicKey
        // if we're good, of course
        if (url === tabUrl) {
          resolve({ publicKey: publicKeySelector(sessionStore.getState()) });
        }

        resolve({ error: "User declined access" });
      };

      responseQueue.push(response);
    });
  };

  const submitTransaction = async () => {
    const {
      transactionXdr,
      network: _network,
      networkPassphrase,
      accountToSign,
    } = request;

    const network =
      _network === null || !_network
        ? MAINNET_NETWORK_DETAILS.network
        : _network;

    const isMainnet = await getIsMainnet();
    const { networkUrl } = await getNetworkDetails();
    const isExperimentalModeEnabled = await getIsExperimentalModeEnabled();
    const SDK = isExperimentalModeEnabled ? SorobanSdk : StellarSdk;

    const { tab, url: tabUrl = "" } = sender;
    const domain = getUrlHostname(tabUrl);
    const punycodedDomain = getPunycodedDomain(domain);

    const allowListStr = (await localStore.getItem(ALLOWLIST_ID)) || "";
    const allowList = allowListStr.split(",");
    const isDomainListedAllowed = await isSenderAllowed({ sender });

    // try to build a tx xdr, if you cannot then assume the user wants to sign an arbitrary blob
    const transaction = SDK.TransactionBuilder.fromXDR(
      transactionXdr,
      networkPassphrase || SDK.Networks[network],
    );

    const directoryLookupJson = await cachedFetch(
      STELLAR_EXPERT_BLOCKED_ACCOUNTS_URL,
      CACHED_BLOCKED_ACCOUNTS_ID,
    );
    const accountData = directoryLookupJson?._embedded?.records || [];

    const _operations =
      transaction._operations || transaction._innerTransaction._operations;

    const flaggedKeys: FlaggedKeys = {};

    const isValidatingMemo = (await getIsMemoValidationEnabled()) && isMainnet;
    const isValidatingSafety =
      (await getIsSafetyValidationEnabled()) && isMainnet;

    if (isValidatingMemo || isValidatingSafety) {
      _operations.forEach((operation: { destination: string }) => {
        accountData.forEach(
          ({ address, tags }: { address: string; tags: Array<string> }) => {
            if (address === operation.destination) {
              let collectedTags = [...tags];

              /* if the user has opted out of validation, remove applicable tags */
              if (!isValidatingMemo) {
                collectedTags.filter(
                  (tag) => tag !== TRANSACTION_WARNING.memoRequired,
                );
              }
              if (!isValidatingSafety) {
                collectedTags = collectedTags.filter(
                  (tag) => tag !== TRANSACTION_WARNING.unsafe,
                );
                collectedTags = collectedTags.filter(
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

    const server = stellarSdkServer(networkUrl);

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
      transactionXdr,
      tab,
      isDomainListedAllowed,
      url: tabUrl,
      flaggedKeys,
      accountToSign,
    } as TransactionInfo;

    transactionQueue.push(transaction);
    const encodedBlob = encodeObject(transactionInfo);
    
    const popup = browser.windows.create({
      url: chrome.runtime.getURL(
        `/index.html#/sign-transaction?${encodedBlob}`,
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
            localStore.setItem(ALLOWLIST_ID, allowList.join());
          }
          resolve({ signedTransaction });
        }

        resolve({ error: "User declined access" });
      };

      responseQueue.push(response);
    });
  };

  const submitBlob = async () => {
    const {
      transactionXdr,
      accountToSign,
    } = request;

    const { tab, url: tabUrl = "" } = sender;
    const domain = getUrlHostname(tabUrl);
    const punycodedDomain = getPunycodedDomain(domain);

    const allowListStr = (await localStore.getItem(ALLOWLIST_ID)) || "";
    const allowList = allowListStr.split(",");
    const isDomainListedAllowed = await isSenderAllowed({ sender });

    const blob = {
      isDomainListedAllowed,
      domain,
      tab,
      blob: transactionXdr,
      url: tabUrl,
      accountToSign
    }

    blobQueue.push(blob);
    const encodedBlob = encodeObject(blob)
    const popup = browser.windows.create({
      url: chrome.runtime.getURL(
        `/index.html#/sign-transaction?${encodedBlob}`,
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
      const response = (signedBlob: string) => {
        if (signedBlob) {
          if (!isDomainListedAllowed) {
            allowList.push(punycodedDomain);
            localStore.setItem(ALLOWLIST_ID, allowList.join());
          }
          resolve({ signedBlob });
        }

        resolve({ error: "User declined access" });
      };

      responseQueue.push(response);
    });
  };

  const requestNetwork = async () => {
    let network = "";

    try {
      ({ network } = await getNetworkDetails());
    } catch (error) {
      console.error(error);
      return { error };
    }
    return { network };
  };

  const requestNetworkDetails = async () => {
    let networkDetails = {
      network: "",
      networkName: "",
      networkUrl: "",
      networkPassphrase: "",
    };

    try {
      networkDetails = await getNetworkDetails();
    } catch (error) {
      console.error(error);
      return { error };
    }
    return { networkDetails };
  };

  const requestConnectionStatus = () => ({ isConnected: true });

  const requestAllowedStatus = async () => {
    const isAllowed = await isSenderAllowed({ sender });

    return { isAllowed };
  };

  const setAllowedStatus = async () => {
    const isAllowed = await isSenderAllowed({ sender });

    const { tab, url: tabUrl = "" } = sender;

    if (isAllowed) {
      // okay, the requester checks out
      return { isAllowed };
    }

    // otherwise, we need to confirm either url or password. Maybe both
    const encodeOrigin = encodeObject({ tab, url: tabUrl });

    browser.windows.create({
      url: chrome.runtime.getURL(`/index.html#/grant-access?${encodeOrigin}`),
      ...WINDOW_SETTINGS,
    });

    return new Promise((resolve) => {
      const response = async (url?: string) => {
        // queue it up, we'll let user confirm the url looks okay and then we'll say it's okay
        if (url === tabUrl) {
          const isAllowedResponse = await isSenderAllowed({ sender });

          resolve({ isAllowed: isAllowedResponse });
        }

        resolve({ error: "User declined access" });
      };

      responseQueue.push(response);
    });
  };

  const requestUserInfo = async () => {
    const publicKey = publicKeySelector(sessionStore.getState());
    const isAllowed = await isSenderAllowed({ sender });
    const notAllowedUserInfo = {
      publicKey: "",
    };
    const userInfo = isAllowed
      ? {
          publicKey,
        }
      : notAllowedUserInfo;

    return {
      userInfo,
    };
  };

  const messageResponder: MessageResponder = {
    [EXTERNAL_SERVICE_TYPES.REQUEST_ACCESS]: requestAccess,
    [EXTERNAL_SERVICE_TYPES.SUBMIT_TRANSACTION]: submitTransaction,
    [EXTERNAL_SERVICE_TYPES.SUBMIT_BLOB]: submitBlob,
    [EXTERNAL_SERVICE_TYPES.REQUEST_NETWORK]: requestNetwork,
    [EXTERNAL_SERVICE_TYPES.REQUEST_NETWORK_DETAILS]: requestNetworkDetails,
    [EXTERNAL_SERVICE_TYPES.REQUEST_CONNECTION_STATUS]: requestConnectionStatus,
    [EXTERNAL_SERVICE_TYPES.REQUEST_ALLOWED_STATUS]: requestAllowedStatus,
    [EXTERNAL_SERVICE_TYPES.SET_ALLOWED_STATUS]: setAllowedStatus,
    [EXTERNAL_SERVICE_TYPES.REQUEST_USER_INFO]: requestUserInfo,
  };

  return messageResponder[request.type]();
};
