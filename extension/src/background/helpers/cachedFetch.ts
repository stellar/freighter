import {
  dataStorageAccess,
  SESSION_STORAGE_ENABLED,
  browserStorage,
  sessionStorage,
} from "background/helpers/dataStorage";

const storageApi = SESSION_STORAGE_ENABLED ? sessionStorage : browserStorage;
const _dataStore = dataStorageAccess(storageApi);

export const cachedFetch = async (url: string, storageKey: string) => {
  const cachedDateId = `${storageKey}_date`;

  const cachedDate = Number((await _dataStore.getItem(cachedDateId)) || "");
  const date = new Date();
  const time = date.getTime();
  const sevenDaysAgo = time - 7 * 24 * 60 * 60 * 1000;

  let directoryLookup = (await _dataStore.getItem(storageKey)) || "{}";

  if (typeof directoryLookup === "string") {
    try {
      const directoryLookupJSON = JSON.parse(directoryLookup);
      directoryLookup = directoryLookupJSON;
    } catch (e) {
      console.error(`cachedFetch JSON parse error: ${e}`);
    }
  }

  if (cachedDate < sevenDaysAgo) {
    try {
      const res = await fetch(url);
      directoryLookup = await res.json();

      await _dataStore.setItem(storageKey, directoryLookup);
      await _dataStore.setItem(cachedDateId, time.toString());
    } catch (e) {
      console.error(e);
    }
  }

  return directoryLookup;
};
