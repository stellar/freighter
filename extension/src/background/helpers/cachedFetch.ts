export const cachedFetch = async (url: string, storageKey: string) => {
  const cachedDateId = `${storageKey}_date`;

  const cachedDate = Number(localStorage.getItem(cachedDateId) || "");
  const date = new Date();
  const time = date.getTime();
  const sevenDaysAgo = time - 7 * 24 * 60 * 60 * 1000;

  let directoryLookupJson = JSON.parse(
    localStorage.getItem(storageKey) || "{}",
  );

  if (cachedDate < sevenDaysAgo) {
    try {
      const res = await fetch(url);
      directoryLookupJson = await res.json();

      localStorage.setItem(storageKey, JSON.stringify(directoryLookupJson));
      localStorage.setItem(cachedDateId, time.toString());
    } catch (e) {
      console.error(e);
    }
  }

  return directoryLookupJson;
};
