/* eslint-disable @typescript-eslint/no-unsafe-argument */

import * as StellarSdk from "stellar-sdk";
import browser from "webextension-polyfill";
import { Store } from "redux";

import {
  ExternalRequestAuthEntry,
  ExternalRequestBlob,
  ExternalRequestTx,
  ExternalRequest as Request,
} from "@shared/api/types";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import {
  FreighterApiInternalError,
  FreighterApiDeclinedError,
} from "@shared/api/helpers/extensionMessaging";
import { MessageResponder } from "background/types";
import { FlaggedKeys, TransactionInfo } from "types/transactions";

import { EXTERNAL_SERVICE_TYPES } from "@shared/constants/services";
import {
  MAINNET_NETWORK_DETAILS,
  NetworkDetails,
} from "@shared/constants/stellar";
import { STELLAR_EXPERT_MEMO_REQUIRED_ACCOUNTS_URL } from "background/constants/apiUrls";
import { POPUP_HEIGHT, POPUP_WIDTH } from "constants/dimensions";
import {
  ALLOWLIST_ID,
  CACHED_MEMO_REQUIRED_ACCOUNTS_ID,
} from "constants/localStorageTypes";
import { TRANSACTION_WARNING } from "constants/transaction";

import {
  getIsMainnet,
  getIsMemoValidationEnabled,
  getNetworkDetails,
} from "background/helpers/account";
import { isSenderAllowed } from "background/helpers/allowListAuthorization";
import { cachedFetch } from "background/helpers/cachedFetch";
import { encodeObject, getUrlHostname, getPunycodedDomain } from "helpers/urls";
import {
  dataStorageAccess,
  browserLocalStorage,
} from "background/helpers/dataStorageAccess";
import { publicKeySelector } from "background/ducks/session";
import { getSdk } from "@shared/helpers/stellar";

import {
  authEntryQueue,
  blobQueue,
  responseQueue,
  transactionQueue,
} from "./popupMessageListener";

const localStore = dataStorageAccess(browserLocalStorage);

interface WindowParams {
  height: number;
  type: "popup";
  width: number;
}

const WINDOW_SETTINGS: WindowParams = {
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
      width: 400,
    });

    return new Promise((resolve) => {
      const response = (url?: string) => {
        // queue it up, we'll let user confirm the url looks okay and then we'll send publicKey
        // if we're good, of course
        if (url === tabUrl) {
          resolve({ publicKey: publicKeySelector(sessionStore.getState()) });
        }

        resolve({
          // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
          apiError: FreighterApiDeclinedError,
          error: FreighterApiDeclinedError.message,
        });
      };

      responseQueue.push(response);
    });
  };

  const requestPublicKey = async () => {
    try {
      const publicKey = publicKeySelector(sessionStore.getState());

      if ((await isSenderAllowed({ sender })) && publicKey) {
        // okay, the requester checks out and we have public key, send it
        return { publicKey };
      }

      return { publicKey: "" };
    } catch (e) {
      return {
        // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
        apiError: FreighterApiInternalError,
        error: FreighterApiInternalError.message,
      };
    }
  };

  const submitTransaction = async () => {
    try {
      const {
        transactionXdr,
        network: _network,
        networkPassphrase,
        accountToSign,
        address: addressToSign,
      } = request as ExternalRequestTx;

      const network =
        _network === null || !_network
          ? MAINNET_NETWORK_DETAILS.network
          : _network;

      const isMainnet = await getIsMainnet();
      const { networkUrl, networkPassphrase: currentNetworkPassphrase } =
        await getNetworkDetails();
      const Sdk = getSdk(currentNetworkPassphrase);

      const { tab, url: tabUrl = "" } = sender;
      const domain = getUrlHostname(tabUrl);
      const punycodedDomain = getPunycodedDomain(domain);

      const allowListStr = (await localStore.getItem(ALLOWLIST_ID)) || "";
      const allowList = allowListStr.split(",");
      const isDomainListedAllowed = await isSenderAllowed({ sender });

      const transaction = Sdk.TransactionBuilder.fromXDR(
        transactionXdr,
        networkPassphrase || Sdk.Networks[network as keyof typeof Sdk.Networks],
      );

      const directoryLookupJson = await cachedFetch(
        STELLAR_EXPERT_MEMO_REQUIRED_ACCOUNTS_URL,
        CACHED_MEMO_REQUIRED_ACCOUNTS_ID,
      );
      const accountData = directoryLookupJson?._embedded?.records || [];

      let _operations = [{}] as StellarSdk.Operation[];

      if ("operations" in transaction) {
        _operations = transaction.operations;
      }

      if ("innerTransaction" in transaction) {
        _operations = transaction.innerTransaction.operations;
      }

      const flaggedKeys: FlaggedKeys = {};

      const isValidatingMemo =
        (await getIsMemoValidationEnabled()) && isMainnet;

      if (isValidatingMemo) {
        _operations.forEach((operation: StellarSdk.Operation) => {
          accountData.forEach(
            ({ address, tags }: { address: string; tags: string[] }) => {
              if (
                "destination" in operation &&
                address === operation.destination
              ) {
                let collectedTags = [...tags];

                /* if the user has opted out of validation, remove applicable tags */
                if (!isValidatingMemo) {
                  collectedTags = collectedTags.filter(
                    (tag) => tag !== TRANSACTION_WARNING.memoRequired,
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

      const server = stellarSdkServer(networkUrl, networkPassphrase);

      try {
        await server.checkMemoRequired(transaction as StellarSdk.Transaction);
      } catch (e: any) {
        if ("accountId" in e) {
          flaggedKeys[e.accountId] = {
            ...flaggedKeys[e.accountId],
            tags: [TRANSACTION_WARNING.memoRequired],
          };
        }
      }

      const transactionInfo = {
        transaction,
        transactionXdr,
        tab,
        isDomainListedAllowed,
        url: tabUrl,
        flaggedKeys,
        accountToSign: accountToSign || addressToSign,
      } as TransactionInfo;

      transactionQueue.push(transaction as StellarSdk.Transaction);
      const encodedBlob = encodeObject(transactionInfo);

      const popup = browser.windows.create({
        url: chrome.runtime.getURL(
          `/index.html#/sign-transaction?${encodedBlob}`,
        ),
        ...WINDOW_SETTINGS,
      });

      return new Promise((resolve) => {
        if (!popup) {
          resolve({
            // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
            apiError: FreighterApiInternalError,
            error: FreighterApiInternalError.message,
          });
        } else {
          browser.windows.onRemoved.addListener(() =>
            resolve({
              // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
              apiError: FreighterApiDeclinedError,
              error: FreighterApiDeclinedError.message,
            }),
          );
        }
        const response = (signedTransaction: string, signerAddress: string) => {
          if (signedTransaction) {
            if (!isDomainListedAllowed) {
              allowList.push(punycodedDomain);
              localStore.setItem(ALLOWLIST_ID, allowList.join());
            }
            resolve({ signedTransaction, signerAddress });
          }

          resolve({
            // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
            apiError: FreighterApiDeclinedError,
            error: FreighterApiDeclinedError.message,
          });
        };

        responseQueue.push(response);
      });
    } catch (e) {
      return {
        // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface

        apiError: FreighterApiInternalError,
        error: FreighterApiInternalError.message,
      };
    }
  };

  const submitBlob = async () => {
    try {
      const { blob, accountToSign, address, networkPassphrase } =
        request as ExternalRequestBlob;

      const { tab, url: tabUrl = "" } = sender;
      const domain = getUrlHostname(tabUrl);
      const punycodedDomain = getPunycodedDomain(domain);

      const allowListStr = (await localStore.getItem(ALLOWLIST_ID)) || "";
      const allowList = allowListStr.split(",");
      const isDomainListedAllowed = await isSenderAllowed({ sender });

      const blobData = {
        isDomainListedAllowed,
        domain,
        tab,
        message: blob,
        url: tabUrl,
        accountToSign: accountToSign || address,
        networkPassphrase,
      };

      blobQueue.push(blobData);
      const encodedBlob = encodeObject(blobData);
      const popup = browser.windows.create({
        url: chrome.runtime.getURL(`/index.html#/sign-message?${encodedBlob}`),
        ...WINDOW_SETTINGS,
      });

      return new Promise((resolve) => {
        if (!popup) {
          resolve({
            // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
            apiError: FreighterApiInternalError,
            error: FreighterApiInternalError.message,
          });
        } else {
          browser.windows.onRemoved.addListener(() =>
            resolve({
              // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
              apiError: FreighterApiDeclinedError,
              error: FreighterApiDeclinedError.message,
            }),
          );
        }

        const response = (signedBlob: string, signerAddress: string) => {
          if (signedBlob) {
            if (!isDomainListedAllowed) {
              allowList.push(punycodedDomain);
              localStore.setItem(ALLOWLIST_ID, allowList.join());
            }
            resolve({ signedBlob, signerAddress });
          }

          resolve({
            // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
            apiError: FreighterApiDeclinedError,
            error: FreighterApiDeclinedError.message,
          });
        };

        responseQueue.push(response);
      });
    } catch (e) {
      return {
        // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
        apiError: FreighterApiInternalError,
        error: FreighterApiInternalError.message,
      };
    }
  };

  const submitAuthEntry = async () => {
    try {
      const { entryXdr, accountToSign, address, networkPassphrase } =
        request as ExternalRequestAuthEntry;

      const { tab, url: tabUrl = "" } = sender;
      const domain = getUrlHostname(tabUrl);
      const punycodedDomain = getPunycodedDomain(domain);

      const allowListStr = (await localStore.getItem(ALLOWLIST_ID)) || "";
      const allowList = allowListStr.split(",");
      const isDomainListedAllowed = await isSenderAllowed({ sender });

      const authEntry = {
        entry: entryXdr,
        accountToSign: accountToSign || address,
        tab,
        domain,
        url: tabUrl,
        networkPassphrase,
      };

      authEntryQueue.push(authEntry);
      const encodedAuthEntry = encodeObject(authEntry);
      const popup = browser.windows.create({
        url: chrome.runtime.getURL(
          `/index.html#/sign-auth-entry?${encodedAuthEntry}`,
        ),
        ...WINDOW_SETTINGS,
      });

      return new Promise((resolve) => {
        if (!popup) {
          resolve({
            // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
            apiError: FreighterApiInternalError,
            error: FreighterApiInternalError.message,
          });
        } else {
          browser.windows.onRemoved.addListener(() =>
            resolve({
              // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
              apiError: FreighterApiDeclinedError,
              error: FreighterApiDeclinedError.message,
            }),
          );
        }
        const response = (signedAuthEntry: string) => {
          if (signedAuthEntry) {
            if (!isDomainListedAllowed) {
              allowList.push(punycodedDomain);
              localStore.setItem(ALLOWLIST_ID, allowList.join());
            }
            resolve({ signedAuthEntry });
          }

          resolve({
            // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
            apiError: FreighterApiDeclinedError,
            error: FreighterApiDeclinedError.message,
          });
        };

        responseQueue.push(response);
      });
    } catch (e) {
      return {
        // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
        apiError: FreighterApiInternalError,
        error: FreighterApiInternalError.message,
      };
    }
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
      sorobanRpcUrl: undefined,
    } as NetworkDetails;

    try {
      networkDetails = await getNetworkDetails();
    } catch (error) {
      console.error(error);
      return {
        // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
        apiError: FreighterApiInternalError,
        error: FreighterApiInternalError.message,
      };
    }
    return { networkDetails };
  };

  const requestConnectionStatus = () => ({ isConnected: true });

  const requestAllowedStatus = async () => {
    try {
      const isAllowed = await isSenderAllowed({ sender });

      return { isAllowed };
    } catch (e) {
      return {
        apiError: FreighterApiInternalError,
      };
    }
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
      width: 400,
    });

    return new Promise((resolve) => {
      const response = async (url?: string) => {
        // queue it up, we'll let user confirm the url looks okay and then we'll say it's okay
        if (url === tabUrl) {
          const isAllowedResponse = await isSenderAllowed({ sender });

          resolve({ isAllowed: isAllowedResponse });
        }

        resolve({
          // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
          apiError: FreighterApiDeclinedError,
          error: FreighterApiDeclinedError.message,
        });
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
    [EXTERNAL_SERVICE_TYPES.REQUEST_PUBLIC_KEY]: requestPublicKey,
    [EXTERNAL_SERVICE_TYPES.SUBMIT_TRANSACTION]: submitTransaction,
    [EXTERNAL_SERVICE_TYPES.SUBMIT_BLOB]: submitBlob,
    [EXTERNAL_SERVICE_TYPES.SUBMIT_AUTH_ENTRY]: submitAuthEntry,
    [EXTERNAL_SERVICE_TYPES.REQUEST_NETWORK]: requestNetwork,
    [EXTERNAL_SERVICE_TYPES.REQUEST_NETWORK_DETAILS]: requestNetworkDetails,
    [EXTERNAL_SERVICE_TYPES.REQUEST_CONNECTION_STATUS]: requestConnectionStatus,
    [EXTERNAL_SERVICE_TYPES.REQUEST_ALLOWED_STATUS]: requestAllowedStatus,
    [EXTERNAL_SERVICE_TYPES.SET_ALLOWED_STATUS]: setAllowedStatus,
    [EXTERNAL_SERVICE_TYPES.REQUEST_USER_INFO]: requestUserInfo,
  };

  return messageResponder[request.type]();
};

/* eslint-enable @typescript-eslint/no-unsafe-argument */
