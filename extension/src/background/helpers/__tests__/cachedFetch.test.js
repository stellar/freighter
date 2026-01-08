import {
  STELLAR_EXPERT_BLOCKED_DOMAINS_URL,
  STELLAR_EXPERT_BLOCKED_ACCOUNTS_URL,
} from "background/constants/apiUrls";
import {
  CACHED_BLOCKED_DOMAINS_ID,
  CACHED_BLOCKED_ACCOUNTS_ID,
} from "constants/localStorageTypes";
import { cachedFetch } from "../cachedFetch";

describe.skip("cached fetch", () => {
  beforeAll(() => {
    localStorage.clear();
  });
  describe("blocked domains", () => {
    it("works", async () => {
      const resp = await cachedFetch(
        STELLAR_EXPERT_BLOCKED_DOMAINS_URL,
        CACHED_BLOCKED_DOMAINS_ID,
      );
      expect(localStorage.getItem(CACHED_BLOCKED_DOMAINS_ID)).toBeTruthy();
      expect(
        `${localStorage.getItem(CACHED_BLOCKED_DOMAINS_ID)}_date`,
      ).toBeTruthy();
    });
  });
  describe("blocked accounts", () => {
    it("works", async () => {
      await cachedFetch(
        STELLAR_EXPERT_BLOCKED_ACCOUNTS_URL,
        CACHED_BLOCKED_ACCOUNTS_ID,
      );
      expect(localStorage.getItem(CACHED_BLOCKED_ACCOUNTS_ID)).toBeTruthy();
      expect(
        `${localStorage.getItem(CACHED_BLOCKED_ACCOUNTS_ID)}_date`,
      ).toBeTruthy();
    });
  });
});
