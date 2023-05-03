import {
  STELLAR_EXPERT_BLOCKED_DOMAINS_URL,
  STELLAR_EXPERT_BLOCKED_ACCOUNTS_URL,
} from "background/constants/apiUrls";
import {
  CACHED_BLOCKED_DOMAINS_ID,
  CACHED_BLOCKED_ACCOUNTS_ID,
} from "constants/localStorageTypes";
import { cachedFetch } from "../cachedFetch";

describe("cached fetch", () => {
  beforeAll(() => {
    browser.storage.local.clear();
  });
  describe("blocked domains", () => {
    it("works", async () => {
      const resp = await cachedFetch(
        STELLAR_EXPERT_BLOCKED_DOMAINS_URL,
        CACHED_BLOCKED_DOMAINS_ID,
      );
      const storedItem = await browser.storage.local.get(
        CACHED_BLOCKED_DOMAINS_ID,
      );
      const storedItemDate = await browser.storage.local.get(
        CACHED_BLOCKED_DOMAINS_ID + "_date",
      );
      expect(storedItem).toBeTruthy();
      expect(browser.storage.local.get(storedItemDate)).toBeTruthy();
    });
  });
  describe("blocked accounts", () => {
    it("works", async () => {
      await cachedFetch(
        STELLAR_EXPERT_BLOCKED_ACCOUNTS_URL,
        CACHED_BLOCKED_ACCOUNTS_ID,
      );
      const storedItem = await browser.storage.local.get(
        CACHED_BLOCKED_ACCOUNTS_ID,
      );
      const storedItemDate = await browser.storage.local.get(
        CACHED_BLOCKED_ACCOUNTS_ID + "_date",
      );
      expect(storedItem).toBeTruthy();
      expect(browser.storage.local.get(storedItemDate)).toBeTruthy();
    });
  });
});
