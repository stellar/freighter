import {
  CACHED_FETCH_ID,
  CACHED_FETCH_DATE_ID,
} from "constants/localStorageTypes";

export const cachedFetch = async (url: string) => {
  const cachedDate = Number(localStorage.getItem(CACHED_FETCH_DATE_ID) || "");
  const date = new Date();
  const time = date.getTime();
  const sevenDaysAgo = time - 7 * 24 * 60 * 60 * 1000;

  if (cachedDate < sevenDaysAgo) {
    const res = await fetch(url);
    const directoryLookupJson = await res.json();
    localStorage.setItem(CACHED_FETCH_ID, JSON.stringify(directoryLookupJson));
    localStorage.setItem(CACHED_FETCH_DATE_ID, time.toString());
    return directoryLookupJson;
  }
  return JSON.parse(localStorage.getItem(CACHED_FETCH_ID) || "{}");
};
