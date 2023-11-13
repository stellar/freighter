import {
  ACCOUNT_NAME_LIST_ID,
  ALLOWLIST_ID,
  KEY_ID_LIST,
  KEY_ID,
  IS_VALIDATING_MEMO_ID,
  IS_VALIDATING_SAFETY_ID,
  IS_VALIDATING_SAFE_ASSETS_ID,
  NETWORK_ID,
  NETWORKS_LIST_ID,
  IS_EXPERIMENTAL_MODE_ID,
  HAS_ACCOUNT_SUBSCRIPTION,
} from "constants/localStorageTypes";
import { DEFAULT_NETWORKS, NetworkDetails } from "@shared/constants/stellar";
import { decodeString, encodeObject } from "helpers/urls";
import { isMainnet, isTestnet, isFuturenet } from "helpers/stellar";
import {
  dataStorageAccess,
  browserLocalStorage,
} from "background/helpers/dataStorage";
import { INDEXER_URLS } from "@shared/constants/mercury";

const localStore = dataStorageAccess(browserLocalStorage);

export const getKeyIdList = async () =>
  (await localStore.getItem(KEY_ID_LIST)) || [];

export const getAccountNameList = async () => {
  const encodedaccountNameList =
    (await localStore.getItem(ACCOUNT_NAME_LIST_ID)) || encodeObject({});

  return JSON.parse(decodeString(encodedaccountNameList));
};

export const addAccountName = async ({
  keyId,
  accountName,
}: {
  keyId: string;
  accountName: string;
}) => {
  const accountNameList = await getAccountNameList();

  accountNameList[keyId] = accountName;

  const encodedaccountNameList = encodeObject(accountNameList);

  await localStore.setItem(ACCOUNT_NAME_LIST_ID, encodedaccountNameList);
};

export const getIsMainnet = async () => {
  const networkDetails = await getNetworkDetails();

  return isMainnet(networkDetails);
};

export const getIsTestnet = async () => {
  const networkDetails = await getNetworkDetails();

  return isTestnet(networkDetails);
};

export const getIsFuturenet = async () => {
  const networkDetails = await getNetworkDetails();

  return isFuturenet(networkDetails);
};

export const getAllowList = async () => {
  const allowList = (await localStore.getItem(ALLOWLIST_ID)) || "";

  if (allowList === "") {
    // manually return an empty array as calling .split(",") will return [""]
    return [];
  }

  return allowList.split(",");
};

export const getIsMemoValidationEnabled = async () =>
  (await localStore.getItem(IS_VALIDATING_MEMO_ID)) ?? true;

export const getIsSafetyValidationEnabled = async () =>
  (await localStore.getItem(IS_VALIDATING_SAFETY_ID)) ?? true;

export const getIsValidatingSafeAssetsEnabled = async () =>
  (await localStore.getItem(IS_VALIDATING_SAFE_ASSETS_ID)) ?? true;

export const getIsExperimentalModeEnabled = async () =>
  (await localStore.getItem(IS_EXPERIMENTAL_MODE_ID)) ?? false;

// hardware wallet helpers
export const HW_PREFIX = "hw:";

export const getIsHardwareWalletActive = async () =>
  ((await localStore.getItem(KEY_ID)) || "").indexOf(HW_PREFIX) > -1;

export const getBipPath = async () => {
  const keyId = (await localStore.getItem(KEY_ID)) || "";
  const hwData = (await localStore.getItem(keyId)) || {};
  return hwData.bipPath || "";
};

export const getSavedNetworks = async (): Promise<NetworkDetails[]> =>
  (await localStore.getItem(NETWORKS_LIST_ID)) || DEFAULT_NETWORKS;

export const getNetworkDetails = async (): Promise<NetworkDetails> => {
  if (!(await localStore.getItem(NETWORK_ID))) {
    await localStore.setItem(NETWORK_ID, DEFAULT_NETWORKS[0]);
  }

  const networkDetails =
    (await localStore.getItem(NETWORK_ID)) || DEFAULT_NETWORKS[0];

  return networkDetails;
};

export const getNetworksList = async () => {
  if (!(await localStore.getItem(NETWORKS_LIST_ID))) {
    await localStore.setItem(NETWORKS_LIST_ID, DEFAULT_NETWORKS);
  }

  const networksList =
    (await localStore.getItem(NETWORKS_LIST_ID)) || DEFAULT_NETWORKS;

  return networksList;
};

export const getIsSorobanSupported = async () => {
  const networkDetails = await getNetworkDetails();
  return !!networkDetails.sorobanRpcUrl;
};

export const subscribeAccount = async (publicKey: string) => {
  // if pub key already has a subscription setup, skip this
  const hasAccountSub = await localStore.getItem(KEY_ID);
  if (hasAccountSub) {
    return { publicKey };
  }
  const networkDetails = await getNetworkDetails();
  const indexerUrl = INDEXER_URLS[networkDetails.network];
  if (!indexerUrl) {
    throw new Error("Indexer not supported");
  }

  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pub_key: publicKey }),
    };
    await fetch(`${indexerUrl}/subscription/account`, options);
    await localStore.setItem(HAS_ACCOUNT_SUBSCRIPTION, true);
  } catch (e) {
    console.error(e);
    throw new Error("Error subscribing account");
  }

  return { publicKey };
};
