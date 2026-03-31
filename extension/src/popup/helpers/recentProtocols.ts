import browser from "webextension-polyfill";

const STORAGE_KEY = "recentProtocols";
const MAX_RECENT = 5;

export interface RecentProtocolEntry {
  websiteUrl: string;
  lastAccessed: number;
}

export const getRecentProtocols = async (): Promise<RecentProtocolEntry[]> => {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as RecentProtocolEntry[]) || [];
};

export const addRecentProtocol = async (websiteUrl: string): Promise<void> => {
  const existing = await getRecentProtocols();
  const filtered = existing.filter((entry) => entry.websiteUrl !== websiteUrl);
  const updated = [{ websiteUrl, lastAccessed: Date.now() }, ...filtered].slice(
    0,
    MAX_RECENT,
  );
  await browser.storage.local.set({ [STORAGE_KEY]: updated });
};

export const clearRecentProtocols = async (): Promise<void> => {
  await browser.storage.local.remove(STORAGE_KEY);
};
