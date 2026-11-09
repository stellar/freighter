import type { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { DERIVATION_INDICES_ID } from "constants/localStorageTypes";

import {
  clearDerivationIndices,
  getDerivationIndices,
  lowestUnusedIndex,
  markDerivationIndexUsed,
  nextDerivationIndex,
  releaseDerivationIndex,
} from "../derivation-indices";

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

const PHRASE_A = "a".repeat(64);
const PHRASE_B = "b".repeat(64);

describe("lowestUnusedIndex", () => {
  it("is 0 for an empty set", () => {
    expect(lowestUnusedIndex([])).toBe(0);
  });

  it("is one past the end of a contiguous set", () => {
    expect(lowestUnusedIndex([0, 1, 2])).toBe(3);
  });

  it("is the lowest gap when the set has holes", () => {
    expect(lowestUnusedIndex([0, 2, 3])).toBe(1);
    expect(lowestUnusedIndex([1, 2])).toBe(0);
  });

  it("ignores order and duplicates", () => {
    expect(lowestUnusedIndex([2, 0, 0, 1])).toBe(3);
  });
});

describe("derivation index sets", () => {
  it("reads an empty set for a source with no entry", async () => {
    const { store } = makeLocalStore();

    expect(
      await getDerivationIndices({ localStore: store, sourceId: PHRASE_A }),
    ).toEqual([]);
    expect(
      await nextDerivationIndex({ localStore: store, sourceId: PHRASE_A }),
    ).toBe(0);
  });

  it("marks an index and persists the set sorted under the source id", async () => {
    const { store, data } = makeLocalStore();

    await markDerivationIndexUsed({
      localStore: store,
      sourceId: PHRASE_A,
      index: 2,
    });
    await markDerivationIndexUsed({
      localStore: store,
      sourceId: PHRASE_A,
      index: 0,
    });

    expect(data[DERIVATION_INDICES_ID]).toEqual({ [PHRASE_A]: [0, 2] });
    expect(
      await nextDerivationIndex({ localStore: store, sourceId: PHRASE_A }),
    ).toBe(1);
  });

  it("marking an index twice stores it once", async () => {
    const { store } = makeLocalStore();

    await markDerivationIndexUsed({
      localStore: store,
      sourceId: PHRASE_A,
      index: 0,
    });
    await markDerivationIndexUsed({
      localStore: store,
      sourceId: PHRASE_A,
      index: 0,
    });

    expect(
      await getDerivationIndices({ localStore: store, sourceId: PHRASE_A }),
    ).toEqual([0]);
  });

  it("keeps each source's set independent", async () => {
    const { store } = makeLocalStore();

    await markDerivationIndexUsed({
      localStore: store,
      sourceId: PHRASE_A,
      index: 0,
    });
    await markDerivationIndexUsed({
      localStore: store,
      sourceId: PHRASE_A,
      index: 1,
    });

    expect(
      await nextDerivationIndex({ localStore: store, sourceId: PHRASE_B }),
    ).toBe(0);
    expect(
      await getDerivationIndices({ localStore: store, sourceId: PHRASE_B }),
    ).toEqual([]);
  });

  it("skips excluded indices without marking them", async () => {
    const { store } = makeLocalStore();
    await markDerivationIndexUsed({
      localStore: store,
      sourceId: PHRASE_A,
      index: 0,
    });

    expect(
      await nextDerivationIndex({
        localStore: store,
        sourceId: PHRASE_A,
        exclude: new Set([1, 2]),
      }),
    ).toBe(3);
    expect(
      await getDerivationIndices({ localStore: store, sourceId: PHRASE_A }),
    ).toEqual([0]);
  });

  it("hands a released index back out as the next one", async () => {
    const { store } = makeLocalStore();
    for (const index of [0, 1, 2]) {
      await markDerivationIndexUsed({
        localStore: store,
        sourceId: PHRASE_A,
        index,
      });
    }

    await releaseDerivationIndex({
      localStore: store,
      sourceId: PHRASE_A,
      index: 1,
    });

    expect(
      await getDerivationIndices({ localStore: store, sourceId: PHRASE_A }),
    ).toEqual([0, 2]);
    expect(
      await nextDerivationIndex({ localStore: store, sourceId: PHRASE_A }),
    ).toBe(1);
  });

  it("releasing an index that is not marked changes nothing", async () => {
    const { store, data } = makeLocalStore();
    await markDerivationIndexUsed({
      localStore: store,
      sourceId: PHRASE_A,
      index: 0,
    });

    await releaseDerivationIndex({
      localStore: store,
      sourceId: PHRASE_A,
      index: 5,
    });
    await releaseDerivationIndex({
      localStore: store,
      sourceId: PHRASE_B,
      index: 0,
    });

    expect(data[DERIVATION_INDICES_ID]).toEqual({ [PHRASE_A]: [0] });
  });

  it("clears every source's set", async () => {
    const { store, data } = makeLocalStore();
    await markDerivationIndexUsed({
      localStore: store,
      sourceId: PHRASE_A,
      index: 0,
    });
    await markDerivationIndexUsed({
      localStore: store,
      sourceId: PHRASE_B,
      index: 0,
    });

    await clearDerivationIndices({ localStore: store });

    expect(data[DERIVATION_INDICES_ID]).toBeUndefined();
    expect(
      await getDerivationIndices({ localStore: store, sourceId: PHRASE_A }),
    ).toEqual([]);
  });
});
