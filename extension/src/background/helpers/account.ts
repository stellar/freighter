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
import { isMainnet, isTestnet } from "helpers/stellar";
import { dataStorageAccess } from "background/helpers/dataStorage";

export const getKeyIdList = async () =>
  JSON.parse((await dataStorageAccess.getItem(KEY_ID_LIST)) || "[]");

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

export const getIsMemoValidationEnabled = async () =>
  JSON.parse(
    (await dataStorageAccess.getItem(IS_VALIDATING_MEMO_ID)) || "true",
  );

export const getIsSafetyValidationEnabled = async () =>
  JSON.parse(
    (await dataStorageAccess.getItem(IS_VALIDATING_SAFETY_ID)) || "true",
  );

export const getIsValidatingSafeAssetsEnabled = async () =>
  JSON.parse(
    (await dataStorageAccess.getItem(IS_VALIDATING_SAFE_ASSETS_ID)) || "true",
  );

export const getIsExperimentalModeEnabled = async () =>
  JSON.parse(
    (await dataStorageAccess.getItem(IS_EXPERIMENTAL_MODE_ID)) || "false",
  );

// hardware wallet helpers
export const HW_PREFIX = "hw:";

export const getIsHardwareWalletActive = async () =>
  ((await dataStorageAccess.getItem(KEY_ID)) || "").indexOf(HW_PREFIX) > -1;

export const getBipPath = async () => {
  const keyId = (await dataStorageAccess.getItem(KEY_ID)) || "";
  const hwData = JSON.parse((await dataStorageAccess.getItem(keyId)) || "{}");
  return hwData.bipPath || "";
};

export const getSavedNetworks = async () =>
  JSON.parse(
    (await dataStorageAccess.getItem(NETWORKS_LIST_ID)) ||
      JSON.stringify(DEFAULT_NETWORKS),
  ) as NetworkDetails[];

export const getNetworkDetails = async () => {
  if (!(await dataStorageAccess.getItem(NETWORK_ID))) {
    await dataStorageAccess.setItem(
      NETWORK_ID,
      JSON.stringify(DEFAULT_NETWORKS[0]),
    );
  }

  const networkDetails = JSON.parse(
    (await dataStorageAccess.getItem(NETWORK_ID)) ||
      JSON.stringify(DEFAULT_NETWORKS[0]),
  ) as NetworkDetails;

  return networkDetails;
};

export const getNetworksList = async () => {
  if (!(await dataStorageAccess.getItem(NETWORKS_LIST_ID))) {
    await dataStorageAccess.setItem(
      NETWORKS_LIST_ID,
      JSON.stringify(DEFAULT_NETWORKS),
    );
  }

  const networksList = JSON.parse(
    (await dataStorageAccess.getItem(NETWORKS_LIST_ID)) ||
      JSON.stringify(DEFAULT_NETWORKS),
  ) as NetworkDetails[];

  return networksList;
};
