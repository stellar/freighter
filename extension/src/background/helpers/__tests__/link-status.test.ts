import type { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { LINK_STATUS_ID } from "constants/localStorageTypes";

import {
  clearLinkStatus,
  getLinkConflicts,
  getLinkStatus,
  recordLinkResults,
} from "../link-status";

// Minimal in-memory DataStorageAccess, as in derivation-indices.test.ts.
const makeLocalStore = () => {
  const data: Record<string, unknown> = {};
  const store = {
    getItem: jest.fn(async (key: string) => data[key]),
    setItem: jest.fn(async (key: string, value: unknown) => {
      data[key] = value;
    }),
    remove: jest.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete data[key];
      }
    }),
  } as unknown as DataStorageAccess;
  return { store, data };
};

const A = "a".repeat(64);
const B = "b".repeat(64);
const C = "c".repeat(64);

describe("link-status", () => {
  it("is empty before any response", async () => {
    const { store } = makeLocalStore();
    expect(await getLinkStatus({ localStore: store })).toEqual({});
    expect(await getLinkConflicts({ localStore: store })).toEqual([]);
  });

  it("merges a later response into the earlier entries", async () => {
    const { store, data } = makeLocalStore();
    await recordLinkResults({ localStore: store, linked: [A], conflicts: [] });
    await recordLinkResults({ localStore: store, linked: [B], conflicts: [C] });

    expect(data[LINK_STATUS_ID]).toEqual({
      [A]: "linked",
      [B]: "linked",
      [C]: "conflict",
    });
    expect(await getLinkConflicts({ localStore: store })).toEqual([C]);
  });

  it("writes nothing for an empty response", async () => {
    const { store, data } = makeLocalStore();
    await recordLinkResults({ localStore: store, linked: [], conflicts: [] });
    expect(LINK_STATUS_ID in data).toBe(false);
  });

  it("clears every entry", async () => {
    const { store } = makeLocalStore();
    await recordLinkResults({ localStore: store, linked: [A], conflicts: [B] });
    await clearLinkStatus({ localStore: store });
    expect(await getLinkStatus({ localStore: store })).toEqual({});
  });
});
