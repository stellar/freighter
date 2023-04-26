import {
  dataStorageAccess,
  browserStorage,
} from "background/helpers/dataStorage";

const dataStore = dataStorageAccess(browserStorage);

export const cachedFetch = async (url: string, storageKey: string) => {
  const cachedDateId = `${storageKey}_date`;

  const cachedDate = Number((await dataStore.getItem(cachedDateId)) || "");
  const date = new Date();
  const time = date.getTime();
  const sevenDaysAgo = time - 7 * 24 * 60 * 60 * 1000;

  let directoryLookup = (await dataStore.getItem(storageKey)) || "{}";

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

      await dataStore.setItem(storageKey, directoryLookup);
      await dataStore.setItem(cachedDateId, time.toString());
    } catch (e) {
      console.error(e);
    }
  }

  return directoryLookup;
};
