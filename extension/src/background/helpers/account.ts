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
import { freighterLocalStorage } from "background/helpers/dataStorage";

export const getKeyIdList = () =>
  JSON.parse(freighterLocalStorage.getItem(KEY_ID_LIST) || "[]");

export const getAccountNameList = () => {
  const encodedaccountNameList =
    freighterLocalStorage.getItem(ACCOUNT_NAME_LIST_ID) || encodeObject({});

  return JSON.parse(decodeString(encodedaccountNameList));
};

export const addAccountName = ({
  keyId,
  accountName,
}: {
  keyId: string;
  accountName: string;
}) => {
  const accountNameList = getAccountNameList();

  accountNameList[keyId] = accountName;

  const encodedaccountNameList = encodeObject(accountNameList);

  freighterLocalStorage.setItem(ACCOUNT_NAME_LIST_ID, encodedaccountNameList);
};

export const getIsMainnet = () => {
  const networkDetails = getNetworkDetails();

  return isMainnet(networkDetails);
};

export const getIsTestnet = () => {
  const networkDetails = getNetworkDetails();

  return isTestnet(networkDetails);
};

export const getIsMemoValidationEnabled = () =>
  JSON.parse(freighterLocalStorage.getItem(IS_VALIDATING_MEMO_ID) || "true");

export const getIsSafetyValidationEnabled = () =>
  JSON.parse(freighterLocalStorage.getItem(IS_VALIDATING_SAFETY_ID) || "true");

export const getIsValidatingSafeAssetsEnabled = () =>
  JSON.parse(
    freighterLocalStorage.getItem(IS_VALIDATING_SAFE_ASSETS_ID) || "true",
  );

export const getIsExperimentalModeEnabled = () =>
  JSON.parse(freighterLocalStorage.getItem(IS_EXPERIMENTAL_MODE_ID) || "false");

// hardware wallet helpers
export const HW_PREFIX = "hw:";

export const getIsHardwareWalletActive = () =>
  (freighterLocalStorage.getItem(KEY_ID) || "").indexOf(HW_PREFIX) > -1;

export const getBipPath = () => {
  const keyId = freighterLocalStorage.getItem(KEY_ID) || "";
  const hwData = JSON.parse(freighterLocalStorage.getItem(keyId) || "{}");
  return hwData.bipPath || "";
};

export const getSavedNetworks = () =>
  JSON.parse(
    freighterLocalStorage.getItem(NETWORKS_LIST_ID) ||
      JSON.stringify(DEFAULT_NETWORKS),
  ) as NetworkDetails[];

export const getNetworkDetails = () => {
  if (!freighterLocalStorage.getItem(NETWORK_ID)) {
    freighterLocalStorage.setItem(
      NETWORK_ID,
      JSON.stringify(DEFAULT_NETWORKS[0]),
    );
  }

  const networkDetails = JSON.parse(
    freighterLocalStorage.getItem(NETWORK_ID) ||
      JSON.stringify(DEFAULT_NETWORKS[0]),
  ) as NetworkDetails;

  return networkDetails;
};

export const getNetworksList = () => {
  if (!freighterLocalStorage.getItem(NETWORKS_LIST_ID)) {
    freighterLocalStorage.setItem(
      NETWORKS_LIST_ID,
      JSON.stringify(DEFAULT_NETWORKS),
    );
  }

  const networksList = JSON.parse(
    freighterLocalStorage.getItem(NETWORKS_LIST_ID) ||
      JSON.stringify(DEFAULT_NETWORKS),
  ) as NetworkDetails[];

  return networksList;
};
