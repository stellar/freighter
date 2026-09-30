import {
  ChangeAssetVisibilityMessage,
  ChangeCollectibleVisibilityMessage,
  GetHiddenAssetsMessage,
  GetHiddenCollectiblesMessage,
} from "@shared/api/types/message-request";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import {
  HIDDEN_ASSETS,
  HIDDEN_COLLECTIBLES,
  NETWORK_ID,
  NETWORKS_LIST_ID,
} from "constants/localStorageTypes";
import { changeAssetVisibility } from "../changeAssetVisibility";
import { changeCollectibleVisibility } from "../changeCollectibleVisibility";
import { getHiddenAssets } from "../getHiddenAssets";
import { getHiddenCollectibles } from "../getHiddenCollectibles";

const PUBLIC_KEY = "GABC123";
const MAINNET = MAINNET_NETWORK_DETAILS.networkName;
const TESTNET = TESTNET_NETWORK_DETAILS.networkName;

/** A promise whose settlement the test controls. */
const deferred = () => {
  let settle: () => void = () => {};
  const promise = new Promise<void>((resolve) => {
    settle = resolve;
  });
  return { promise, settle: () => settle() };
};

/**
 * Backs the handlers with a store whose `NETWORK_ID` read can be held open, so
 * a test can commit a network switch in the middle of one -- which is what
 * `changeNetwork` does to any request already in flight.
 */
const makeLocalStore = (seed: Record<string, unknown>) => {
  const store: Record<string, unknown> = {
    [NETWORK_ID]: MAINNET_NETWORK_DETAILS,
    [NETWORKS_LIST_ID]: DEFAULT_NETWORKS,
    ...seed,
  };
  let networkReadGate: Promise<void> | null = null;

  return {
    getItem: jest.fn(async (key: string) => {
      if (key === NETWORK_ID && networkReadGate) {
        await networkReadGate;
      }
      return store[key];
    }),
    setItem: jest.fn(async (key: string, value: unknown) => {
      store[key] = value;
    }),
    remove: jest.fn(),
    clear: jest.fn(),
    read: () => store,
    holdNetworkRead: (gate: Promise<void>) => {
      networkReadGate = gate;
    },
    releaseNetworkRead: () => {
      networkReadGate = null;
    },
    switchNetworkTo: (networkDetails: unknown) => {
      store[NETWORK_ID] = networkDetails;
    },
  } as any;
};

const HIDDEN_ON_MAINNET = { "CMAINNET:1": "hidden" };
const HIDDEN_ON_TESTNET = { "CTESTNET:1": "hidden" };

const ASSET_ON_MAINNET = { "USDC:GMAINNET": "hidden" };
const ASSET_ON_TESTNET = { "USDC:GTESTNET": "hidden" };

const seededStore = () =>
  makeLocalStore({
    [HIDDEN_COLLECTIBLES]: {
      [MAINNET]: { [PUBLIC_KEY]: HIDDEN_ON_MAINNET },
      [TESTNET]: { [PUBLIC_KEY]: HIDDEN_ON_TESTNET },
    },
    [HIDDEN_ASSETS]: {
      [MAINNET]: { [PUBLIC_KEY]: ASSET_ON_MAINNET },
      [TESTNET]: { [PUBLIC_KEY]: ASSET_ON_TESTNET },
    },
  });

// The request carries only `activePublicKey`, so the response is the only thing
// that can say which network answered. Without it the popup keys its mirror off
// the network it was on when it asked, and a switch landing mid-flight files one
// network's map under the other -- where the selector reads it as loaded and
// never refetches.
describe("hidden visibility network scoping", () => {
  it("reports the network it resolved alongside the map", async () => {
    const localStore = seededStore();

    const result = await getHiddenCollectibles({
      request: { activePublicKey: PUBLIC_KEY } as GetHiddenCollectiblesMessage,
      localStore,
    });

    expect(result).toEqual({
      hiddenCollectibles: HIDDEN_ON_MAINNET,
      networkName: MAINNET,
    });
  });

  it("reports the post-switch network when a read spans a network change", async () => {
    const localStore = seededStore();
    const gate = deferred();
    localStore.holdNetworkRead(gate.promise);

    const pending = getHiddenCollectibles({
      request: { activePublicKey: PUBLIC_KEY } as GetHiddenCollectiblesMessage,
      localStore,
    });

    // What `changeNetwork` does while this request is already in flight: it
    // writes NETWORK_ID and cancels nothing.
    localStore.switchNetworkTo(TESTNET_NETWORK_DETAILS);
    localStore.releaseNetworkRead();
    gate.settle();

    // The map is testnet's, and the response says so. A caller keying this off
    // the network it asked from would file testnet's map under mainnet.
    expect(await pending).toEqual({
      hiddenCollectibles: HIDDEN_ON_TESTNET,
      networkName: TESTNET,
    });
  });

  it("reports the network a visibility write landed in", async () => {
    const localStore = seededStore();
    const gate = deferred();
    localStore.holdNetworkRead(gate.promise);

    const pending = changeCollectibleVisibility({
      request: {
        collectibleVisibility: { collectible: "CNEW:2", visibility: "hidden" },
        activePublicKey: PUBLIC_KEY,
      } as ChangeCollectibleVisibilityMessage,
      localStore,
    });

    localStore.switchNetworkTo(TESTNET_NETWORK_DETAILS);
    localStore.releaseNetworkRead();
    gate.settle();

    const result = await pending;

    expect(result.networkName).toBe(TESTNET);
    expect(result.hiddenCollectibles).toEqual({
      ...HIDDEN_ON_TESTNET,
      "CNEW:2": "hidden",
    });
    // The write itself went to testnet, so mirroring it under mainnet would
    // disagree with storage until the popup reloads.
    expect(localStore.read()[HIDDEN_COLLECTIBLES][MAINNET][PUBLIC_KEY]).toEqual(
      HIDDEN_ON_MAINNET,
    );
  });
  it("reports the post-switch network when an asset read spans a network change", async () => {
    const localStore = seededStore();
    const gate = deferred();
    localStore.holdNetworkRead(gate.promise);

    const pending = getHiddenAssets({
      request: { activePublicKey: PUBLIC_KEY } as GetHiddenAssetsMessage,
      localStore,
    });

    localStore.switchNetworkTo(TESTNET_NETWORK_DETAILS);
    localStore.releaseNetworkRead();
    gate.settle();

    expect(await pending).toEqual({
      hiddenAssets: ASSET_ON_TESTNET,
      networkName: TESTNET,
    });
  });

  it("reports the network an asset visibility write landed in", async () => {
    const localStore = seededStore();
    const gate = deferred();
    localStore.holdNetworkRead(gate.promise);

    const pending = changeAssetVisibility({
      request: {
        assetVisibility: { assetKey: "NEW:GXYZ", visibility: "hidden" },
        activePublicKey: PUBLIC_KEY,
      } as ChangeAssetVisibilityMessage,
      localStore,
    });

    localStore.switchNetworkTo(TESTNET_NETWORK_DETAILS);
    localStore.releaseNetworkRead();
    gate.settle();

    const result = await pending;

    expect(result.networkName).toBe(TESTNET);
    expect(result.hiddenAssets).toEqual({
      ...ASSET_ON_TESTNET,
      "NEW:GXYZ": "hidden",
    });
    // `useGetBalances` treats a present key as loaded and never re-asks, so
    // mirroring this under mainnet would outlive the switch.
    expect(localStore.read()[HIDDEN_ASSETS][MAINNET][PUBLIC_KEY]).toEqual(
      ASSET_ON_MAINNET,
    );
  });
});
