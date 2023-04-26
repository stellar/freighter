import browser from "webextension-polyfill";

import { ALLOWLIST_ID } from "constants/localStorageTypes";
import { getUrlHostname, getPunycodedDomain } from "helpers/urls";
import {
  dataStorageAccess,
  browserStorage,
} from "background/helpers/dataStorage";

export const isSenderAllowed = async ({
  sender,
}: {
  sender: browser.Runtime.MessageSender;
}) => {
  const dataStore = dataStorageAccess(browserStorage);
  const allowListStr = (await dataStore.getItem(ALLOWLIST_ID)) || "";
  const allowList = allowListStr.split(",");

  const { url: tabUrl = "" } = sender;
  const domain = getUrlHostname(tabUrl);

  return allowList.includes(getPunycodedDomain(domain));
};
