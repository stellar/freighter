import { freighterLocalStorage } from "background/helpers/dataStorage";

export const cachedFetch = async (url: string, storageKey: string) => {
  const cachedDateId = `${storageKey}_date`;

  const cachedDate = Number(freighterLocalStorage.getItem(cachedDateId) || "");
  const date = new Date();
  const time = date.getTime();
  const sevenDaysAgo = time - 7 * 24 * 60 * 60 * 1000;

  let directoryLookupJson = JSON.parse(
    (await freighterLocalStorage.getItem(storageKey)) || "{}",
  );

  if (cachedDate < sevenDaysAgo) {
    try {
      const res = await fetch(url);
      directoryLookupJson = await res.json();

      await freighterLocalStorage.setItem(
        storageKey,
        JSON.stringify(directoryLookupJson),
      );
      await freighterLocalStorage.setItem(cachedDateId, time.toString());
    } catch (e) {
      console.error(e);
    }
  }

  return directoryLookupJson;
};
