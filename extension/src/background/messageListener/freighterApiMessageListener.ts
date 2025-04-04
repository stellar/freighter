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
  getNetworksList,
  getAllowListSegment,
  setAllowListDomain,
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

const getNetworkDetailsFromNetworkpassphrase = async (
  networkPassphrase: string,
) => {
  const networksList = await getNetworksList();

  const networkDetails = networksList.find(
    (currentNetwork: NetworkDetails) =>
      currentNetwork.networkPassphrase === networkPassphrase,
  );

  return networkDetails;
};

export const freighterApiMessageListener = (
  request: Request,
  sender: browser.Runtime.MessageSender,
  sessionStore: Store,
) => {
  const requestAccess = async () => {
    const publicKey = publicKeySelector(sessionStore.getState());

    const { tab, url: tabUrl = "" } = sender;

    const networkDetails = await getNetworkDetails();

    const allowListSegment = await getAllowListSegment({
      publicKey,
      networkDetails,
    });

    if (isSenderAllowed({ sender, allowListSegment }) && publicKey) {
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
      const networkDetails = await getNetworkDetails();
      const allowListSegment = await getAllowListSegment({
        publicKey,
        networkDetails,
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
      const publicKey = publicKeySelector(sessionStore.getState());

      const networkPassphrase =
        reqNetworkPassphrase || MAINNET_NETWORK_DETAILS.networkPassphrase;

      const { tab, url: tabUrl = "" } = sender;
      const domain = getUrlHostname(tabUrl);
      const punycodedDomain = getPunycodedDomain(domain);

      const networkDetails = await getNetworkDetailsFromNetworkpassphrase(
        networkPassphrase,
      );

      const allowListSegment = await getAllowListSegment({
        publicKey,
        networkDetails,
      });
      const isDomainListedAllowed = isSenderAllowed({
        sender,
        allowListSegment,
      });

      const tokenInfo: TokenToAdd = {
        isDomainListedAllowed,
        domain: punycodedDomain,
        tab,
        url: tabUrl,
        contractId,
        networkPassphrase,
      };

      tokenQueue.push(tokenInfo);
      const encodedTokenInfo = encodeObject(tokenInfo);

      const popup = browser.windows.create({
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
            if (!isDomainListedAllowed) {
              setAllowListDomain({
                publicKey,
                domain: punycodedDomain,
                networkDetails,
              });
            }
            resolve({
              contractId,
            });
          }

          resolve({
            apiError: FreighterApiDeclinedError,
          });
        };

        responseQueue.push(response);
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

      const isMainnet = await getIsMainnet();
      const { networkUrl, networkPassphrase: currentNetworkPassphrase } =
        await getNetworkDetails();
      const Sdk = getSdk(currentNetworkPassphrase);
      const publicKey = publicKeySelector(sessionStore.getState());

      const { tab, url: tabUrl = "" } = sender;
      const domain = getUrlHostname(tabUrl);
      const punycodedDomain = getPunycodedDomain(domain);

      const networkDetails = await getNetworkDetails();
      const allowListSegment = await getAllowListSegment({
        publicKey,
        networkDetails,
      });
      const isDomainListedAllowed = isSenderAllowed({
        sender,
        allowListSegment,
      });

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
              setAllowListDomain({
                publicKey,
                domain: punycodedDomain,
                networkDetails,
              });
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
      const { apiVersion, blob, accountToSign, address, networkPassphrase } =
        request as ExternalRequestBlob;

      const publicKey = publicKeySelector(sessionStore.getState());

      const { tab, url: tabUrl = "" } = sender;
      const domain = getUrlHostname(tabUrl);
      const punycodedDomain = getPunycodedDomain(domain);

      const networkDetails = await getNetworkDetailsFromNetworkpassphrase(
        networkPassphrase || MAINNET_NETWORK_DETAILS.networkPassphrase,
      );
      const allowListSegment = await getAllowListSegment({
        publicKey,
        networkDetails,
      });
      const isDomainListedAllowed = isSenderAllowed({
        sender,
        allowListSegment,
      });

      const blobData: MessageToSign = {
        isDomainListedAllowed,
        domain: punycodedDomain,
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
              setAllowListDomain({
                publicKey,
                domain: punycodedDomain,
                networkDetails,
              });
            }
            if (apiVersion && semver.gte(apiVersion, "4.0.0")) {
              resolve({
                signedBlob: Buffer.from(signedBlob).toString("base64"),
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
      const publicKey = publicKeySelector(sessionStore.getState());
      const networkDetails = await getNetworkDetailsFromNetworkpassphrase(
        networkPassphrase || MAINNET_NETWORK_DETAILS.networkPassphrase,
      );

      const allowListSegment = await getAllowListSegment({
        publicKey,
        networkDetails,
      });
      const isDomainListedAllowed = isSenderAllowed({
        sender,
        allowListSegment,
      });

      const authEntry: EntryToSign = {
        isDomainListedAllowed,
        entry: entryXdr,
        accountToSign: accountToSign || address,
        tab,
        domain: punycodedDomain,
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
              setAllowListDomain({
                publicKey,
                domain: punycodedDomain,
                networkDetails,
              });
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
      const publicKey = publicKeySelector(sessionStore.getState());
      const networkDetails = await getNetworkDetails();

      const allowListSegment = await getAllowListSegment({
        publicKey,
        networkDetails,
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
    const networkDetails = await getNetworkDetails();
    const allowListSegment = await getAllowListSegment({
      publicKey,
      networkDetails,
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

      responseQueue.push(response);
    });
  };

  const requestUserInfo = async () => {
    const publicKey = publicKeySelector(sessionStore.getState());
    const networkDetails = await getNetworkDetails();
    const allowListSegment = await getAllowListSegment({
      publicKey,
      networkDetails,
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
