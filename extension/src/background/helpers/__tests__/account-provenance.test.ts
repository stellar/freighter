import { AccountType } from "@shared/api/types";
import type { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { ACCOUNT_PROVENANCE_ID } from "constants/localStorageTypes";

import {
  clearAccountProvenance,
  getAccountProvenance,
  removeAccountProvenance,
  setAccountProvenance,
} from "../account-provenance";

// Minimal in-memory DataStorageAccess: plain values, no encoding, so tests can
// inspect exactly what the module persists. `getItem` returns undefined for a
// missing key, as the real store does.
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
    clear: jest.fn(async () => {
      for (const key of Object.keys(data)) {
        delete data[key];
      }
    }),
  } as unknown as DataStorageAccess;
  return { store, data };
};

const PHRASE_ID = "a".repeat(64);
const KEY_ID = "b".repeat(64);

describe("account provenance", () => {
  it("is empty when nothing is stored", async () => {
    const { store } = makeLocalStore();

    expect(await getAccountProvenance({ localStore: store })).toEqual({});
  });

  it("persists one plain entry per keystore id", async () => {
    const { store, data } = makeLocalStore();

    await setAccountProvenance({
      localStore: store,
      keyId: "key-0",
      type: AccountType.FREIGHTER,
      sourceId: PHRASE_ID,
    });
    await setAccountProvenance({
      localStore: store,
      keyId: "key-1",
      type: AccountType.IMPORTED,
      sourceId: KEY_ID,
    });
    await setAccountProvenance({
      localStore: store,
      keyId: "hw:GHW",
      type: AccountType.HW,
    });

    expect(data[ACCOUNT_PROVENANCE_ID]).toEqual({
      "key-0": { type: AccountType.FREIGHTER, sourceId: PHRASE_ID },
      "key-1": { type: AccountType.IMPORTED, sourceId: KEY_ID },
      "hw:GHW": { type: AccountType.HW },
    });
    expect(await getAccountProvenance({ localStore: store })).toEqual(
      data[ACCOUNT_PROVENANCE_ID],
    );
  });

  it("replaces an entry written again for the same id", async () => {
    const { store } = makeLocalStore();
    await setAccountProvenance({
      localStore: store,
      keyId: "key-0",
      type: AccountType.FREIGHTER,
      sourceId: PHRASE_ID,
    });

    await setAccountProvenance({
      localStore: store,
      keyId: "key-0",
      type: AccountType.IMPORTED,
      sourceId: KEY_ID,
    });

    expect(await getAccountProvenance({ localStore: store })).toEqual({
      "key-0": { type: AccountType.IMPORTED, sourceId: KEY_ID },
    });
  });

  it("removes one entry and leaves the rest", async () => {
    const { store } = makeLocalStore();
    await setAccountProvenance({
      localStore: store,
      keyId: "key-0",
      type: AccountType.FREIGHTER,
      sourceId: PHRASE_ID,
    });
    await setAccountProvenance({
      localStore: store,
      keyId: "key-1",
      type: AccountType.FREIGHTER,
      sourceId: PHRASE_ID,
    });

    await removeAccountProvenance({ localStore: store, keyId: "key-0" });

    expect(await getAccountProvenance({ localStore: store })).toEqual({
      "key-1": { type: AccountType.FREIGHTER, sourceId: PHRASE_ID },
    });
  });

  it("removing an id with no entry changes nothing", async () => {
    const { store, data } = makeLocalStore();
    await setAccountProvenance({
      localStore: store,
      keyId: "key-0",
      type: AccountType.FREIGHTER,
      sourceId: PHRASE_ID,
    });
    const before = JSON.stringify(data[ACCOUNT_PROVENANCE_ID]);

    await removeAccountProvenance({ localStore: store, keyId: "legacy" });

    expect(JSON.stringify(data[ACCOUNT_PROVENANCE_ID])).toBe(before);
  });

  it("clears the whole map", async () => {
    const { store, data } = makeLocalStore();
    await setAccountProvenance({
      localStore: store,
      keyId: "key-0",
      type: AccountType.FREIGHTER,
      sourceId: PHRASE_ID,
    });

    await clearAccountProvenance({ localStore: store });

    expect(data[ACCOUNT_PROVENANCE_ID]).toBeUndefined();
    expect(await getAccountProvenance({ localStore: store })).toEqual({});
  });
});
