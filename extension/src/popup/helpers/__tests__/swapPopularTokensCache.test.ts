const mockStore = new Map<string, any>();

jest.mock("background/helpers/dataStorageAccess", () => ({
  browserLocalStorage: {},
  dataStorageAccess: () => ({
    getItem: async (key: string) => mockStore.get(key),
    setItem: async (key: string, value: any) => {
      mockStore.set(key, value);
    },
  }),
}));

import {
  getPersistedPopularTokens,
  setPersistedPopularTokens,
} from "../swapPopularTokensCache";
import { POPULAR_TOKENS_STALE_MS } from "popup/ducks/cache";

const tokens = [
  { code: "AQUA", issuer: "GBNZ", domain: null, volume7d: 5 },
] as any;

describe("swapPopularTokensCache", () => {
  beforeEach(() => mockStore.clear());

  it("round-trips a fresh write", async () => {
    await setPersistedPopularTokens("PUBLIC", tokens);
    expect(await getPersistedPopularTokens("PUBLIC")).toEqual(tokens);
  });

  it("returns null when nothing is persisted", async () => {
    expect(await getPersistedPopularTokens("PUBLIC")).toBeNull();
  });

  it("returns null when the entry is older than the staleness window", async () => {
    mockStore.set("swap_top_tokens_PUBLIC", {
      tokens,
      updatedAt: Date.now() - POPULAR_TOKENS_STALE_MS - 1,
    });
    expect(await getPersistedPopularTokens("PUBLIC")).toBeNull();
  });

  it("is scoped per network", async () => {
    await setPersistedPopularTokens("PUBLIC", tokens);
    expect(await getPersistedPopularTokens("TESTNET")).toBeNull();
  });
});
