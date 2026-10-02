import {
  ChangeAssetVisibilityMessage,
  ChangeCollectibleVisibilityMessage,
} from "@shared/api/types/message-request";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
  NETWORK_NAMES,
} from "@shared/constants/stellar";
import {
  HIDDEN_ASSETS,
  HIDDEN_COLLECTIBLES,
  NETWORK_ID,
  NETWORKS_LIST_ID,
} from "constants/localStorageTypes";
import { changeAssetVisibility } from "../changeAssetVisibility";
import { changeCollectibleVisibility } from "../changeCollectibleVisibility";

const PUBLIC_KEY = "GABC123";
const CUSTOM_NETWORK = {
  network: "STANDALONE",
  networkName: "My Standalone Network",
  networkUrl: "http://localhost:8000",
  networkPassphrase: "Standalone Network ; February 2017",
};

const makeLocalStore = (seed: Record<string, unknown>) => {
  const store: Record<string, unknown> = {
    [NETWORK_ID]: MAINNET_NETWORK_DETAILS,
    [NETWORKS_LIST_ID]: [...DEFAULT_NETWORKS, CUSTOM_NETWORK],
    ...seed,
  };
  return {
    getItem: jest.fn(async (key: string) => store[key]),
    setItem: jest.fn(async (key: string, value: unknown) => {
      store[key] = value;
    }),
    remove: jest.fn(),
    clear: jest.fn(),
    read: () => store,
  } as any;
};

// A write that lands before the 5.46.0 / 5.47.0 migration has run -- which
// happens whenever the storage version is missing or ahead, or in a session
// where the migration threw and is waiting to retry. The store reader answers
// `{}` for the old shape, so a writer that spreads it would replace the whole
// flat map. The result has no string leaves, so the migration would then treat
// it as already migrated and the earlier hides would be gone for good.
// The outgoing API sends `assetKey` and the legacy `issuer` alias together, so
// a worker predating the rename still finds one it understands. These cover the
// mirror case: a page predating the rename reaching this worker.
describe("changeAssetVisibility identifier handling", () => {
  it("accepts a payload carrying only the legacy issuer field", async () => {
    const localStore = makeLocalStore({});

    const result = await changeAssetVisibility({
      request: {
        assetVisibility: { issuer: "NEW:GXYZ", visibility: "hidden" },
        activePublicKey: PUBLIC_KEY,
      } as unknown as ChangeAssetVisibilityMessage,
      localStore,
    });

    expect(result).toEqual({
      hiddenAssets: { "NEW:GXYZ": "hidden" },
      // The network the write landed in; see hiddenVisibilityNetworkScope.
      networkName: NETWORK_NAMES.PUBNET,
    });
    expect(
      localStore.read()[HIDDEN_ASSETS][NETWORK_NAMES.PUBNET][PUBLIC_KEY],
    ).toEqual({ "NEW:GXYZ": "hidden" });
  });

  it("writes nothing and reports an error when no identifier is present", async () => {
    const localStore = makeLocalStore({
      [HIDDEN_ASSETS]: {
        [NETWORK_NAMES.PUBNET]: { [PUBLIC_KEY]: { "USDC:GA5ZSE": "hidden" } },
      },
    });

    const result = await changeAssetVisibility({
      request: {
        assetVisibility: { visibility: "hidden" },
        activePublicKey: PUBLIC_KEY,
      } as unknown as ChangeAssetVisibilityMessage,
      localStore,
    });

    // Keying off `undefined` would write the literal "undefined" and still
    // report success, so Hide would silently do nothing while the UI said it
    // worked -- the worst shape of failure.
    expect(result).toEqual({ error: "Missing asset identifier" });
    expect(localStore.setItem).not.toHaveBeenCalled();
    expect(
      localStore.read()[HIDDEN_ASSETS][NETWORK_NAMES.PUBNET][PUBLIC_KEY],
    ).toEqual({ "USDC:GA5ZSE": "hidden" });
  });
});

describe("visibility writes against a legacy flat store", () => {
  it("keeps earlier hidden assets when the store is still a flat map", async () => {
    const localStore = makeLocalStore({
      [HIDDEN_ASSETS]: { "USDC:GA5ZSE": "hidden", "EURC:GB3Q6": "visible" },
    });

    const { hiddenAssets } = await changeAssetVisibility({
      request: {
        assetVisibility: { assetKey: "NEW:GXYZ", visibility: "hidden" },
        activePublicKey: PUBLIC_KEY,
      } as ChangeAssetVisibilityMessage,
      localStore,
    });

    expect(hiddenAssets).toEqual({
      "USDC:GA5ZSE": "hidden",
      "EURC:GB3Q6": "visible",
      "NEW:GXYZ": "hidden",
    });

    const stored = localStore.read()[HIDDEN_ASSETS];
    // The old map applied everywhere, so it is carried to every configured
    // network -- including the custom one, which readers would otherwise miss.
    expect(stored[NETWORK_NAMES.TESTNET][PUBLIC_KEY]).toEqual({
      "USDC:GA5ZSE": "hidden",
      "EURC:GB3Q6": "visible",
    });
    expect(stored[CUSTOM_NETWORK.networkName][PUBLIC_KEY]).toEqual({
      "USDC:GA5ZSE": "hidden",
      "EURC:GB3Q6": "visible",
    });
  });

  it("keeps earlier hidden collectibles when the store is still a flat map", async () => {
    const localStore = makeLocalStore({
      [HIDDEN_COLLECTIBLES]: { "CDPENGUIN:102510": "hidden" },
    });

    const { hiddenCollectibles } = await changeCollectibleVisibility({
      request: {
        collectibleVisibility: {
          collectible: "CDDOMAIN:7",
          visibility: "hidden",
        },
        activePublicKey: PUBLIC_KEY,
      } as ChangeCollectibleVisibilityMessage,
      localStore,
    });

    expect(hiddenCollectibles).toEqual({
      "CDPENGUIN:102510": "hidden",
      "CDDOMAIN:7": "hidden",
    });
    expect(
      localStore.read()[HIDDEN_COLLECTIBLES][CUSTOM_NETWORK.networkName][
        PUBLIC_KEY
      ],
    ).toEqual({ "CDPENGUIN:102510": "hidden" });
  });

  it("leaves an already-nested store alone", async () => {
    const nested = {
      [NETWORK_NAMES.PUBNET]: { [PUBLIC_KEY]: { "USDC:GA5ZSE": "hidden" } },
      [NETWORK_NAMES.TESTNET]: {},
    };
    const localStore = makeLocalStore({ [HIDDEN_ASSETS]: nested });

    await changeAssetVisibility({
      request: {
        assetVisibility: { assetKey: "NEW:GXYZ", visibility: "hidden" },
        activePublicKey: PUBLIC_KEY,
      } as ChangeAssetVisibilityMessage,
      localStore,
    });

    const stored = localStore.read()[HIDDEN_ASSETS];
    expect(stored[NETWORK_NAMES.PUBNET][PUBLIC_KEY]).toEqual({
      "USDC:GA5ZSE": "hidden",
      "NEW:GXYZ": "hidden",
    });
    expect(stored[NETWORK_NAMES.TESTNET]).toEqual({});
    expect(stored[CUSTOM_NETWORK.networkName]).toBeUndefined();
  });
});
