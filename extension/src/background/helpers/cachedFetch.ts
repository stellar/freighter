import {
  dataStorageAccess,
  browserLocalStorage,
} from "background/helpers/dataStorageAccess";

const localStore = dataStorageAccess(browserLocalStorage);

export const cachedFetch = async (url: string, storageKey: string) => {
  const cachedDateId = `${storageKey}_date`;

  const cachedDate = Number((await localStore.getItem(cachedDateId)) || "");
  const date = new Date();
  const time = date.getTime();
  const sevenDaysAgo = time - 7 * 24 * 60 * 60 * 1000;

  let directoryLookup = (await localStore.getItem(storageKey)) || "{}";

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

      await localStore.setItem(storageKey, directoryLookup);
      await localStore.setItem(cachedDateId, time.toString());
    } catch (e) {
      console.error(e);
    }
  }

  return directoryLookup;
};
