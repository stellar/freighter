import { dataStorageAccess } from "background/helpers/dataStorage";

export const cachedFetch = async (url: string, storageKey: string) => {
  const cachedDateId = `${storageKey}_date`;

  const cachedDate = Number(
    (await dataStorageAccess.getItem(cachedDateId)) || "",
  );
  const date = new Date();
  const time = date.getTime();
  const sevenDaysAgo = time - 7 * 24 * 60 * 60 * 1000;

  let directoryLookupJson = JSON.parse(
    (await dataStorageAccess.getItem(storageKey)) || "{}",
  );

  if (cachedDate < sevenDaysAgo) {
    try {
      const res = await fetch(url);
      directoryLookupJson = await res.json();

      await dataStorageAccess.setItem(
        storageKey,
        JSON.stringify(directoryLookupJson),
      );
      await dataStorageAccess.setItem(cachedDateId, time.toString());
    } catch (e) {
      console.error(e);
    }
  }

  return directoryLookupJson;
};
