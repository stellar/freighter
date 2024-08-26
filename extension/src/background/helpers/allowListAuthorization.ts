import browser from "webextension-polyfill";

import { ALLOWLIST_ID } from "constants/localStorageTypes";
import { getUrlHostname, getPunycodedDomain } from "helpers/urls";
import {
  dataStorageAccess,
  browserLocalStorage,
} from "background/helpers/dataStorageAccess";

export const isSenderAllowed = async ({
  sender,
}: {
  sender: browser.Runtime.MessageSender;
}) => {
  const localStore = dataStorageAccess(browserLocalStorage);
  const allowListStr = (await localStore.getItem(ALLOWLIST_ID)) || "";
  const allowList = allowListStr.split(",");

  const { url: tabUrl = "" } = sender;
  const domain = getUrlHostname(tabUrl);

  return allowList.includes(getPunycodedDomain(domain));
};
