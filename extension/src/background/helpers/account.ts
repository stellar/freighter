import {
  ACCOUNT_NAME_LIST_ID,
  ALLOWLIST_ID,
  KEY_ID_LIST,
  KEY_ID,
  IS_VALIDATING_MEMO_ID,
  NETWORK_ID,
  NETWORKS_LIST_ID,
  IS_EXPERIMENTAL_MODE_ID,
  HAS_ACCOUNT_SUBSCRIPTION,
  ASSETS_LISTS_ID,
  IS_HASH_SIGNING_ENABLED_ID,
  IS_NON_SSL_ENABLED_ID,
  IS_HIDE_DUST_ENABLED_ID,
  LAST_USED_ACCOUNT,
} from "constants/localStorageTypes";
import { DEFAULT_NETWORKS, NetworkDetails } from "@shared/constants/stellar";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";
import { getSorobanRpcUrl } from "@shared/helpers/soroban/sorobanRpcUrl";
import { isCustomNetwork } from "@shared/helpers/stellar";
import { decodeString, encodeObject } from "helpers/urls";
import { isMainnet, isTestnet, isFuturenet } from "helpers/stellar";
import {
  dataStorageAccess,
  browserLocalStorage,
} from "background/helpers/dataStorageAccess";
import { INDEXER_URL } from "@shared/constants/mercury";
import { captureException } from "@sentry/browser";

const localStore = dataStorageAccess(browserLocalStorage);

export const getKeyIdList = async () =>
  (await localStore.getItem(KEY_ID_LIST)) || [];

export const getAccountNameList = async () => {
  const encodedaccountNameList =
    ((await localStore.getItem(ACCOUNT_NAME_LIST_ID)) as string) ||
    encodeObject({});

  return JSON.parse(decodeString(encodedaccountNameList));
};

export const addAccountName = async ({
  keyId,
  accountName,
}: {
  keyId: string;
  accountName: string;
}) => {
  const accountNameList = (await getAccountNameList()) as Record<
    string,
    string
  >;

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

export const getIsExperimentalModeEnabled = async () =>
  (await localStore.getItem(IS_EXPERIMENTAL_MODE_ID)) ?? false;

export const getIsHashSigningEnabled = async () =>
  (await localStore.getItem(IS_HASH_SIGNING_ENABLED_ID)) ?? false;

// hardware wallet helpers
export const HW_PREFIX = "hw:";

export const getIsHardwareWalletActive = async () =>
  ((await localStore.getItem(KEY_ID)) || "").indexOf(HW_PREFIX) > -1;

export const getBipPath = async () => {
  const keyId = ((await localStore.getItem(KEY_ID)) as string) || "";
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

export const getAssetsLists = async () => {
  if (!(await localStore.getItem(ASSETS_LISTS_ID))) {
    await localStore.setItem(ASSETS_LISTS_ID, DEFAULT_ASSETS_LISTS);
  }
  const assetLists =
    (await localStore.getItem(ASSETS_LISTS_ID)) ?? DEFAULT_ASSETS_LISTS;

  return assetLists;
};

export const getIsNonSSLEnabled = async () => {
  if (!(await localStore.getItem(IS_NON_SSL_ENABLED_ID))) {
    await localStore.setItem(IS_NON_SSL_ENABLED_ID, false);
  }
  const isNonSSLEnabled =
    (await localStore.getItem(IS_NON_SSL_ENABLED_ID)) ?? false;

  return isNonSSLEnabled;
};

export const getIsHideDustEnabled = async () => {
  const isHideDustEnabled =
    (await localStore.getItem(IS_HIDE_DUST_ENABLED_ID)) ?? true;

  return isHideDustEnabled;
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

      if (!res.ok) {
        captureException(`Failed to load rpc health for Soroban`);
      }
      rpcHealth = await res.json();
    } catch (e) {
      captureException(
        `Failed to load rpc health for Soroban - ${JSON.stringify(e)}`,
      );
      console.error(e);
    }
  }

  if (rpcHealth.status !== "healthy") {
    captureException(`Soroban RPC is not healthy - ${rpcHealth.status}`);
  }

  return rpcHealth.status === "healthy";
};

export const getUserNotification = async () => {
  let response = { enabled: false, message: "" };

  try {
    const res = await fetch(`${INDEXER_URL}/user-notification`);
    response = await res.json();
  } catch (e) {
    captureException(`Failed to load user notification - ${JSON.stringify(e)}`);
    console.error(e);
  }

  return response;
};

export const getFeatureFlags = async () => {
  let featureFlags = { useSorobanPublic: false };

  try {
    const res = await fetch(`${INDEXER_URL}/feature-flags`);
    featureFlags = await res.json();
  } catch (e) {
    captureException(`Failed to load feature flag - ${JSON.stringify(e)}`);
    console.error(e);
  }

  return featureFlags;
};

export const subscribeAccount = async (publicKey: string) => {
  // update last used account so we can use it to properly
  // display the identicon component on login screen
  await localStore.setItem(LAST_USED_ACCOUNT, publicKey);

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

    const res = await fetch(`${INDEXER_URL}/subscription/account`, options);
    const subsByKeyId = {
      ...hasAccountSubByKeyId,
      [keyId]: true,
    };

    if (res.ok) {
      await localStore.setItem(HAS_ACCOUNT_SUBSCRIPTION, subsByKeyId);
    } else {
      const resJson = (await res.json()) as string;
      throw new Error(resJson);
    }
  } catch (e) {
    console.error(e);
  }

  return { publicKey };
};

export const subscribeTokenBalance = async ({
  publicKey,
  contractId,
  network,
}: {
  publicKey: string;
  contractId: string;
  network: string;
}) => {
  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pub_key: publicKey,
        contract_id: contractId,
        network,
      }),
    };

    const res = await fetch(
      `${INDEXER_URL}/subscription/token-balance`,
      options,
    );

    if (!res.ok) {
      const resJson = (await res.json()) as string;
      throw new Error(resJson);
    }
  } catch (e) {
    console.error(e);
    captureException(`Failed to subscribe token balance - ${contractId}`);
  }
};

export const subscribeTokenHistory = async ({
  publicKey,
  contractId,
  network,
}: {
  publicKey: string;
  contractId: string;
  network: string;
}) => {
  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pub_key: publicKey,
        contract_id: contractId,
        network,
      }),
    };

    const res = await fetch(`${INDEXER_URL}/subscription/token`, options);

    if (!res.ok) {
      const resJson = (await res.json()) as string;
      throw new Error(resJson);
    }
  } catch (e) {
    console.error(e);
    captureException(`Failed to subscribe token history - ${contractId}`);
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
