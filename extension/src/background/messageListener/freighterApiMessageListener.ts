import { Store } from "redux";
import semver from "semver";
import * as StellarSdk from "stellar-sdk";
import browser from "webextension-polyfill";

import {
  ExternalRequestAuthEntry,
  ExternalRequestBlob,
  ExternalRequestToken,
  ExternalRequestTx,
  ExternalRequest as Request,
} from "@shared/api/types";
import {
  ResponseQueue,
  SignTransactionResponse,
  SignBlobResponse,
  SignAuthEntryResponse,
  AddTokenResponse,
  RequestAccessResponse,
  SetAllowedStatusResponse,
} from "@shared/api/types/message-request";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import {
  FreighterApiInternalError,
  FreighterApiDeclinedError,
} from "@shared/api/helpers/extensionMessaging";
import { EXTERNAL_SERVICE_TYPES } from "@shared/constants/services";
import {
  MAINNET_NETWORK_DETAILS,
  NetworkDetails,
} from "@shared/constants/stellar";
import { getSdk } from "@shared/helpers/stellar";

import { MessageResponder } from "background/types";
import { STELLAR_EXPERT_MEMO_REQUIRED_ACCOUNTS_URL } from "background/constants/apiUrls";
import {
  getIsMainnet,
  getIsMemoValidationEnabled,
  getNetworkDetails,
  getAllowListSegment,
} from "background/helpers/account";
import { isSenderAllowed } from "background/helpers/allowListAuthorization";
import { cachedFetch } from "background/helpers/cachedFetch";
import { publicKeySelector } from "background/ducks/session";

import { POPUP_HEIGHT, POPUP_WIDTH } from "constants/dimensions";
import { CACHED_MEMO_REQUIRED_ACCOUNTS_ID } from "constants/localStorageTypes";
import { TRANSACTION_WARNING } from "constants/transaction";

import {
  encodeObject,
  getUrlHostname,
  getPunycodedDomain,
  TokenToAdd,
  MessageToSign,
  EntryToSign,
} from "helpers/urls";

import { FlaggedKeys, TransactionInfo } from "types/transactions";

import {
  authEntryQueue,
  blobQueue,
  responseQueue,
  tokenQueue,
  transactionQueue,
} from "./popupMessageListener";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

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
  localStore: DataStorageAccess,
) => {
  const requestAccess = async () => {
    const publicKey = publicKeySelector(sessionStore.getState());

    const { tab, url: tabUrl = "" } = sender;

    const networkDetails = await getNetworkDetails({ localStore });

    const allowListSegment = await getAllowListSegment({
      publicKey,
      networkDetails,
      localStore,
    });

    if (isSenderAllowed({ sender, allowListSegment }) && publicKey) {
      // okay, the requester checks out and we have public key, send it
      return { publicKey };
    }

    // otherwise, we need to confirm either url or password. Maybe both
    const encodeOrigin = encodeObject({ tab, url: tabUrl });

    const window = await browser.windows.create({
      url: chrome.runtime.getURL(`/index.html#/grant-access?${encodeOrigin}`),
      ...WINDOW_SETTINGS,
      width: 400,
    });

    return new Promise((resolve) => {
      const response = async (url: string, publicKey?: string) => {
        // queue it up, we'll let user confirm the url looks okay and then we'll send publicKey
        // if we're good, of course
        if (url === tabUrl) {
          /* 
            This timeout is a bit of a hack to ensure the window doesn't close before the promise resolves.
            Wrapping in a setTimeout queues up the wndows.remove action into the event loop, but allows the promise to resolve first.
            This is really only an issue in e2e tests as the e2e window closes too quickly to register a click.
          */
          setTimeout(() => {
            if (window.id) {
              // ensure the window is closed to prevent collisions with other popups
              browser.windows.remove(window.id);
            }
          }, 50);

          resolve({ publicKey });
        }

        resolve({
          // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
          apiError: FreighterApiDeclinedError,
          error: FreighterApiDeclinedError.message,
        });
      };

      (responseQueue as ResponseQueue<RequestAccessResponse>).push(response);
    });
  };

  const requestPublicKey = async () => {
    try {
      const publicKey = publicKeySelector(sessionStore.getState());
      const networkDetails = await getNetworkDetails({ localStore });
      const allowListSegment = await getAllowListSegment({
        publicKey,
        networkDetails,
        localStore,
      });

      if (isSenderAllowed({ sender, allowListSegment }) && publicKey) {
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

  const submitToken = async () => {
    try {
      const { contractId, networkPassphrase: reqNetworkPassphrase } =
        request as ExternalRequestToken;

      const networkPassphrase =
        reqNetworkPassphrase || MAINNET_NETWORK_DETAILS.networkPassphrase;

      const { tab, url: tabUrl = "" } = sender;
      const domain = getUrlHostname(tabUrl);
      const punycodedDomain = getPunycodedDomain(domain);

      const tokenInfo: TokenToAdd = {
        domain: punycodedDomain,
        tab,
        url: tabUrl,
        contractId,
        networkPassphrase,
      };

      tokenQueue.push(tokenInfo);
      const encodedTokenInfo = encodeObject(tokenInfo);

      const popup = await browser.windows.create({
        url: chrome.runtime.getURL(
          `/index.html#/add-token?${encodedTokenInfo}`,
        ),
        ...WINDOW_SETTINGS,
      });

      return new Promise((resolve) => {
        if (!popup) {
          resolve({
            apiError: FreighterApiInternalError,
          });
        } else {
          browser.windows.onRemoved.addListener(() =>
            resolve({
              apiError: FreighterApiDeclinedError,
            }),
          );
        }
        const response = (success: boolean) => {
          if (success) {
            resolve({
              contractId,
            });
          }

          resolve({
            apiError: FreighterApiDeclinedError,
          });
        };

        (responseQueue as ResponseQueue<AddTokenResponse>).push(response);
      });
    } catch (e) {
      return {
        apiError: FreighterApiInternalError,
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

      const isMainnet = await getIsMainnet({ localStore });
      const { networkUrl, networkPassphrase: currentNetworkPassphrase } =
        await getNetworkDetails({ localStore });
      const Sdk = getSdk(currentNetworkPassphrase);
      const { tab, url: tabUrl = "" } = sender;

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
        (await getIsMemoValidationEnabled({ localStore })) && isMainnet;

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

      const server = stellarSdkServer(
        networkUrl,
        networkPassphrase || transaction.networkPassphrase,
      );

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
        url: tabUrl,
        flaggedKeys,
        accountToSign: accountToSign || addressToSign,
      } as TransactionInfo;

      transactionQueue.push(transaction as StellarSdk.Transaction);
      const encodedBlob = encodeObject(transactionInfo);

      const popup = await browser.windows.create({
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
        const response = (
          signedTransaction: string,
          signerAddress?: string,
        ) => {
          if (signedTransaction) {
            resolve({ signedTransaction, signerAddress });
          }

          resolve({
            // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
            apiError: FreighterApiDeclinedError,
            error: FreighterApiDeclinedError.message,
          });
        };

        (responseQueue as ResponseQueue<SignTransactionResponse>).push(
          response,
        );
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
      const { apiVersion, blob, accountToSign, address, networkPassphrase } =
        request as ExternalRequestBlob;

      const { tab, url: tabUrl = "" } = sender;
      const domain = getUrlHostname(tabUrl);
      const punycodedDomain = getPunycodedDomain(domain);

      console.log(blob);

      const blobData: MessageToSign = {
        apiVersion,
        domain: punycodedDomain,
        tab,
        message: blob,
        url: tabUrl,
        accountToSign: accountToSign || address,
        networkPassphrase,
      };

      blobQueue.push(blobData);
      const encodedBlob = encodeObject(blobData);
      const popup = await browser.windows.create({
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

        const response = (
          signedBlob: SignBlobResponse,
          signerAddress?: string,
        ) => {
          if (signedBlob) {
            if (apiVersion && semver.gte(apiVersion, "4.0.0")) {
              resolve({
                signedBlob: signedBlob.toString("base64"),
                signerAddress,
              });
              return;
            }
            resolve({ signedBlob, signerAddress });
          }

          resolve({
            // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
            apiError: FreighterApiDeclinedError,
            error: FreighterApiDeclinedError.message,
          });
        };

        (responseQueue as ResponseQueue<SignBlobResponse>).push(response);
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
      const {
        apiVersion,
        entryXdr,
        accountToSign,
        address,
        networkPassphrase,
      } = request as ExternalRequestAuthEntry;

      const { tab, url: tabUrl = "" } = sender;
      const domain = getUrlHostname(tabUrl);
      const punycodedDomain = getPunycodedDomain(domain);

      const authEntry: EntryToSign = {
        entry: entryXdr,
        accountToSign: accountToSign || address,
        tab,
        domain: punycodedDomain,
        url: tabUrl,
        networkPassphrase,
      };

      authEntryQueue.push(authEntry);
      const encodedAuthEntry = encodeObject(authEntry);
      const popup = await browser.windows.create({
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
        const response = (
          signedAuthEntry: SignAuthEntryResponse,
          signerAddress?: string,
        ) => {
          if (signedAuthEntry) {
            if (apiVersion && semver.gte(apiVersion, "4.2.0")) {
              resolve({
                signedAuthEntry:
                  Buffer.from(signedAuthEntry).toString("base64"),
                signerAddress,
              });
              return;
            }
            resolve({ signedAuthEntry, signerAddress });
          }

          resolve({
            // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
            apiError: FreighterApiDeclinedError,
            error: FreighterApiDeclinedError.message,
          });
        };
        (responseQueue as ResponseQueue<SignAuthEntryResponse>).push(response);
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
      ({ network } = await getNetworkDetails({ localStore }));
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
      networkDetails = await getNetworkDetails({ localStore });
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
      const publicKey = publicKeySelector(sessionStore.getState());
      const networkDetails = await getNetworkDetails({ localStore });

      const allowListSegment = await getAllowListSegment({
        publicKey,
        networkDetails,
        localStore,
      });
      const isAllowed = isSenderAllowed({ sender, allowListSegment });

      return { isAllowed };
    } catch (e) {
      return {
        apiError: FreighterApiInternalError,
      };
    }
  };

  const setAllowedStatus = async () => {
    const publicKey = publicKeySelector(sessionStore.getState());
    const networkDetails = await getNetworkDetails({ localStore });
    const allowListSegment = await getAllowListSegment({
      publicKey,
      networkDetails,
      localStore,
    });

    const isAllowed = isSenderAllowed({ sender, allowListSegment });

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
          const updatedAllAccountsllowListSegment = await getAllowListSegment({
            publicKey,
            networkDetails,
            localStore,
          });
          const isAllowedResponse = isSenderAllowed({
            sender,
            allowListSegment: updatedAllAccountsllowListSegment,
          });

          resolve({ isAllowed: isAllowedResponse });
        }

        resolve({
          // return 2 error formats: one for clients running older versions of freighter-api, and one to adhere to the standard wallet interface
          apiError: FreighterApiDeclinedError,
          error: FreighterApiDeclinedError.message,
        });
      };

      (responseQueue as ResponseQueue<SetAllowedStatusResponse>).push(response);
    });
  };

  const requestUserInfo = async () => {
    const publicKey = publicKeySelector(sessionStore.getState());
    const networkDetails = await getNetworkDetails({ localStore });
    const allowListSegment = await getAllowListSegment({
      publicKey,
      networkDetails,
      localStore,
    });

    const isAllowed = isSenderAllowed({ sender, allowListSegment });
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
    [EXTERNAL_SERVICE_TYPES.SUBMIT_TOKEN]: submitToken,
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
