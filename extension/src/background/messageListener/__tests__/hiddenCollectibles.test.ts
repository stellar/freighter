import { SERVICE_TYPES } from "@shared/constants/services";
import { HIDDEN_COLLECTIBLES } from "constants/localStorageTypes";
import { changeCollectibleVisibility } from "../handlers/changeCollectibleVisibility";
import { getHiddenCollectibles } from "../handlers/getHiddenCollectibles";
import type { ChangeCollectibleVisibilityMessage } from "@shared/api/types/message-request";

const TEST_NET = "Test Net";
const MAIN_NET = "Main Net";

let mockNetworkName = TEST_NET;

jest.mock("background/helpers/account", () => ({
  getNetworkDetails: jest
    .fn()
    .mockImplementation(() =>
      Promise.resolve({ networkName: mockNetworkName }),
    ),
}));

const ACCOUNT_A = "GAAAA";
const ACCOUNT_B = "GBBBB";
const PENGUIN = "CDPENGUIN:102510";
const DOMAIN = "CDDOMAIN:7";

const makeStore = (initial: Record<string, any> = {}) => {
  const data: Record<string, any> = { ...initial };
  return {
    getItem: jest.fn(async (key: string) => data[key]),
    setItem: jest.fn(async (key: string, value: any) => {
      data[key] = value;
    }),
    read: () => data[HIDDEN_COLLECTIBLES],
  } as any;
};

const hide = (publicKey: string, collectible: string, localStore: any) =>
  changeCollectibleVisibility({
    request: {
      type: SERVICE_TYPES.CHANGE_COLLECTIBLE_VISIBILITY,
      activePublicKey: publicKey,
      collectibleVisibility: { collectible, visibility: "hidden" },
    } as ChangeCollectibleVisibilityMessage,
    localStore,
  });

const read = (publicKey: string, localStore: any) =>
  getHiddenCollectibles({
    request: {
      type: SERVICE_TYPES.GET_HIDDEN_COLLECTIBLES,
      activePublicKey: publicKey,
    } as any,
    localStore,
  });

describe("hidden collectibles scoping", () => {
  beforeEach(() => {
    mockNetworkName = TEST_NET;
  });

  it("hiding a collectible on one account does not hide it on another", async () => {
    const localStore = makeStore();

    await hide(ACCOUNT_A, PENGUIN, localStore);

    expect((await read(ACCOUNT_A, localStore)).hiddenCollectibles).toEqual({
      [PENGUIN]: "hidden",
    });
    expect((await read(ACCOUNT_B, localStore)).hiddenCollectibles).toEqual({});
  });

  it("hiding a collectible on one network does not hide it on another", async () => {
    const localStore = makeStore();

    await hide(ACCOUNT_A, PENGUIN, localStore);
    expect((await read(ACCOUNT_A, localStore)).hiddenCollectibles).toEqual({
      [PENGUIN]: "hidden",
    });

    mockNetworkName = MAIN_NET;
    expect((await read(ACCOUNT_A, localStore)).hiddenCollectibles).toEqual({});
  });

  it("writes under [network][publicKey] and preserves other branches", async () => {
    const localStore = makeStore();

    await hide(ACCOUNT_A, PENGUIN, localStore);
    await hide(ACCOUNT_B, DOMAIN, localStore);
    mockNetworkName = MAIN_NET;
    await hide(ACCOUNT_A, "CDOTHER:1", localStore);

    expect(localStore.read()).toEqual({
      [TEST_NET]: {
        [ACCOUNT_A]: { [PENGUIN]: "hidden" },
        [ACCOUNT_B]: { [DOMAIN]: "hidden" },
      },
      [MAIN_NET]: {
        [ACCOUNT_A]: { "CDOTHER:1": "hidden" },
      },
    });
  });

  it("returns the account's leaf, never the whole store", async () => {
    const localStore = makeStore();

    const { hiddenCollectibles } = await hide(ACCOUNT_A, PENGUIN, localStore);

    expect(hiddenCollectibles).toEqual({ [PENGUIN]: "hidden" });
    expect(hiddenCollectibles).not.toHaveProperty(TEST_NET);
  });

  it("treats a pre-migration flat map as empty rather than as visibilities", async () => {
    // A user whose storage version is missing or ahead skips the migration, so
    // the reader has to recognise the old shape itself.
    const localStore = makeStore({
      [HIDDEN_COLLECTIBLES]: { [PENGUIN]: "hidden", [DOMAIN]: "visible" },
    });

    expect((await read(ACCOUNT_A, localStore)).hiddenCollectibles).toEqual({});
  });

  it("does not clobber sibling accounts when writing over a legacy map", async () => {
    const localStore = makeStore({
      [HIDDEN_COLLECTIBLES]: { [PENGUIN]: "hidden" },
    });

    await hide(ACCOUNT_A, DOMAIN, localStore);

    expect(localStore.read()).toEqual({
      [TEST_NET]: { [ACCOUNT_A]: { [DOMAIN]: "hidden" } },
    });
  });

  it("unhiding writes 'visible' rather than deleting the entry", async () => {
    const localStore = makeStore();

    await hide(ACCOUNT_A, PENGUIN, localStore);
    await changeCollectibleVisibility({
      request: {
        type: SERVICE_TYPES.CHANGE_COLLECTIBLE_VISIBILITY,
        activePublicKey: ACCOUNT_A,
        collectibleVisibility: {
          collectible: PENGUIN,
          visibility: "visible",
        },
      } as ChangeCollectibleVisibilityMessage,
      localStore,
    });

    expect((await read(ACCOUNT_A, localStore)).hiddenCollectibles).toEqual({
      [PENGUIN]: "visible",
    });
  });
});
