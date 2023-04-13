import {
  ACCOUNT_NAME_LIST_ID,
  KEY_ID_LIST,
  KEY_ID,
  IS_VALIDATING_MEMO_ID,
  IS_VALIDATING_SAFETY_ID,
  IS_VALIDATING_SAFE_ASSETS_ID,
  NETWORK_ID,
  NETWORKS_LIST_ID,
  IS_EXPERIMENTAL_MODE_ID,
} from "constants/localStorageTypes";
import { DEFAULT_NETWORKS, NetworkDetails } from "@shared/constants/stellar";
import { decodeString, encodeObject } from "helpers/urls";
import { isMainnet, isTestnet, isFuturenet } from "helpers/stellar";
import { dataStorageAccess } from "background/helpers/dataStorage";

export const getKeyIdList = async () =>
  (await dataStorageAccess.getItem(KEY_ID_LIST)) || [];

export const getAccountNameList = async () => {
  const encodedaccountNameList =
    (await dataStorageAccess.getItem(ACCOUNT_NAME_LIST_ID)) || encodeObject({});

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

  await dataStorageAccess.setItem(ACCOUNT_NAME_LIST_ID, encodedaccountNameList);
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

export const getIsMemoValidationEnabled = async () =>
  (await dataStorageAccess.getItem(IS_VALIDATING_MEMO_ID)) || true;

export const getIsSafetyValidationEnabled = async () =>
  (await dataStorageAccess.getItem(IS_VALIDATING_SAFETY_ID)) || true;

export const getIsValidatingSafeAssetsEnabled = async () =>
  (await dataStorageAccess.getItem(IS_VALIDATING_SAFE_ASSETS_ID)) || true;

export const getIsExperimentalModeEnabled = async () =>
  (await dataStorageAccess.getItem(IS_EXPERIMENTAL_MODE_ID)) || false;

// hardware wallet helpers
export const HW_PREFIX = "hw:";

export const getIsHardwareWalletActive = async () =>
  ((await dataStorageAccess.getItem(KEY_ID)) || "").indexOf(HW_PREFIX) > -1;

export const getBipPath = async () => {
  const keyId = (await dataStorageAccess.getItem(KEY_ID)) || "";
  const hwData = (await dataStorageAccess.getItem(keyId)) || {};
  return hwData.bipPath || "";
};

export const getSavedNetworks = async (): Promise<NetworkDetails[]> =>
  (await dataStorageAccess.getItem(NETWORKS_LIST_ID)) || DEFAULT_NETWORKS;

export const getNetworkDetails = async () => {
  if (!(await dataStorageAccess.getItem(NETWORK_ID))) {
    await dataStorageAccess.setItem(NETWORK_ID, DEFAULT_NETWORKS[0]);
  }

  const networkDetails =
    (await dataStorageAccess.getItem(NETWORK_ID)) || DEFAULT_NETWORKS[0];

  return networkDetails;
};

export const getNetworksList = async () => {
  if (!(await dataStorageAccess.getItem(NETWORKS_LIST_ID))) {
    await dataStorageAccess.setItem(NETWORKS_LIST_ID, DEFAULT_NETWORKS);
  }

  const networksList =
    (await dataStorageAccess.getItem(NETWORKS_LIST_ID)) || DEFAULT_NETWORKS;

  return networksList;
};
