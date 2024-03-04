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
import { getSorobanRpcUrl } from "@shared/helpers/soroban/sorobanRpcUrl";
import { decodeString, encodeObject } from "helpers/urls";
import {
  isMainnet,
  isTestnet,
  isFuturenet,
  isCustomNetwork,
} from "helpers/stellar";
import {
  dataStorageAccess,
  browserLocalStorage,
} from "background/helpers/dataStorage";
import { INDEXER_URL } from "@shared/constants/mercury";
import { captureException } from "@sentry/browser";

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

export const getIsRpcHealthy = async (networkDetails: NetworkDetails) => {
  let rpcHealth = { status: "" };
  if (isCustomNetwork(networkDetails)) {
    // TODO: use server.getHealth method to get accurate result for standalone network
    rpcHealth = { status: "healthy" };
  } else {
    try {
      const res = await fetch(
        `${INDEXER_URL}/rpc-health?network=${networkDetails.network}`,
      );
      rpcHealth = await res.json();
    } catch (e) {
      captureException(
        `Failed to load rpc health for Soroban - ${JSON.stringify(e)}`,
      );
      console.error(e);
    }
  }

  return rpcHealth.status === "healthy";
};

export const getFeatureFlags = async () => {
  let featureFlags = { useSorobanPublic: false };

  try {
    const res = await fetch(`${INDEXER_URL}/feature-flags`);
    featureFlags = await res.json();
  } catch (e) {
    captureException(
      `Failed to load feature flag for Soroban mainnet - ${JSON.stringify(e)}`,
    );
    console.error(e);
  }

  return featureFlags;
};

export const subscribeAccount = async (publicKey: string) => {
  // if pub key already has a subscription setup, skip this
  const keyId = await localStore.getItem(KEY_ID);
  const hasAccountSubByKeyId =
    (await localStore.getItem(HAS_ACCOUNT_SUBSCRIPTION)) || {};
  if (!keyId || hasAccountSubByKeyId[keyId]) {
    return { publicKey };
  }

  try {
    const networkDetails = await getNetworkDetails();
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pub_key: publicKey,
        network: networkDetails.network,
      }),
    };
    await fetch(`${INDEXER_URL}/subscription/account`, options);
    const subsByKeyId = {
      ...hasAccountSubByKeyId,
      [keyId]: true,
    };
    await localStore.setItem(HAS_ACCOUNT_SUBSCRIPTION, subsByKeyId);
  } catch (e) {
    console.error(e);
    captureException(
      `Failed to subscribe account with Mercury - ${JSON.stringify(e)}`,
    );
    throw new Error("Error subscribing account");
  }

  return { publicKey };
};

export const subscribeTokenBalance = async (
  publicKey: string,
  contractId: string,
) => {
  try {
    const networkDetails = await getNetworkDetails();
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pub_key: publicKey,
        contract_id: contractId,
        network: networkDetails.network,
      }),
    };
    await fetch(`${INDEXER_URL}/subscription/token-balance`, options);
  } catch (e) {
    console.error(e);
    captureException(
      `Failed to subscribe token balance - ${JSON.stringify(e)}`,
    );
    throw new Error(`Error subscribing to token: ${contractId}`);
  }
};

export const subscribeTokenHistory = async (
  publicKey: string,
  contractId: string,
) => {
  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ pub_key: publicKey, contract_id: contractId }),
    };
    await fetch(`${INDEXER_URL}/subscription/token`, options);
  } catch (e) {
    console.error(e);
    captureException(
      `Failed to subscribe token history - ${JSON.stringify(e)}`,
    );
    throw new Error(`Error subscribing to token: ${contractId}`);
  }
};

export const verifySorobanRpcUrls = async () => {
  const networkDetails = await getNetworkDetails();

  if (!networkDetails.sorobanRpcUrl) {
    networkDetails.sorobanRpcUrl = getSorobanRpcUrl(networkDetails);

    await localStore.setItem(NETWORK_ID, networkDetails);
  }

  const networksList: NetworkDetails[] = await getNetworksList();

  for (let i = 0; i < networksList.length; i += 1) {
    const networksListDetails = networksList[i];

    if (!networksListDetails.sorobanRpcUrl) {
      networksListDetails.sorobanRpcUrl = getSorobanRpcUrl(networkDetails);
    }
  }
  await localStore.setItem(NETWORKS_LIST_ID, networksList);
};
