import {
  CACHED_FETCH_ID,
  CACHED_FETCH_DATE_ID,
} from "constants/localStorageTypes";

export const cachedFetch = async (url: string) => {
  const cachedDate = Number(localStorage.getItem(CACHED_FETCH_DATE_ID) || "");
  const date = new Date();
  const time = date.getTime();
  const sevenDaysAgo = time - 7 * 24 * 60 * 60 * 1000;

  let directoryLookupJson = JSON.parse(
    localStorage.getItem(CACHED_FETCH_ID) || "{}",
  );

  if (cachedDate < sevenDaysAgo) {
    try {
      const res = await fetch(url);
      directoryLookupJson = await res.json();

      localStorage.setItem(
        CACHED_FETCH_ID,
        JSON.stringify(directoryLookupJson),
      );
      localStorage.setItem(CACHED_FETCH_DATE_ID, time.toString());
    } catch (e) {
      console.error(e);
    }
  }
  return directoryLookupJson;
};
