import { SERVICE_TYPES } from "@shared/constants/services";
import { HIDDEN_ASSETS } from "constants/localStorageTypes";
import { changeAssetVisibility } from "../handlers/changeAssetVisibility";
import { getHiddenAssets } from "../handlers/getHiddenAssets";
import type { ChangeAssetVisibilityMessage } from "@shared/api/types/message-request";

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
const USDC = "USDC:GA5ZSE";

const makeStore = (initial: Record<string, any> = {}) => {
  const data: Record<string, any> = { ...initial };
  return {
    getItem: jest.fn(async (key: string) => data[key]),
    setItem: jest.fn(async (key: string, value: any) => {
      data[key] = value;
    }),
    read: () => data[HIDDEN_ASSETS],
  } as any;
};

const hide = (publicKey: string, assetKey: string, localStore: any) =>
  changeAssetVisibility({
    request: {
      type: SERVICE_TYPES.CHANGE_ASSET_VISIBILITY,
      activePublicKey: publicKey,
      assetVisibility: { assetKey, visibility: "hidden" },
    } as ChangeAssetVisibilityMessage,
    localStore,
  });

const read = (publicKey: string, localStore: any) =>
  getHiddenAssets({
    request: {
      type: SERVICE_TYPES.GET_HIDDEN_ASSETS,
      activePublicKey: publicKey,
    } as any,
    localStore,
  });

describe("hidden assets scoping", () => {
  beforeEach(() => {
    mockNetworkName = TEST_NET;
  });

  it("hiding an asset on one account does not hide it on another", async () => {
    const localStore = makeStore();

    await hide(ACCOUNT_A, USDC, localStore);

    expect((await read(ACCOUNT_A, localStore)).hiddenAssets).toEqual({
      [USDC]: "hidden",
    });
    expect((await read(ACCOUNT_B, localStore)).hiddenAssets).toEqual({});
  });

  it("hiding an asset on one network does not hide it on another", async () => {
    const localStore = makeStore();

    await hide(ACCOUNT_A, USDC, localStore);
    expect((await read(ACCOUNT_A, localStore)).hiddenAssets).toEqual({
      [USDC]: "hidden",
    });

    mockNetworkName = MAIN_NET;
    expect((await read(ACCOUNT_A, localStore)).hiddenAssets).toEqual({});
  });

  it("writes under [network][publicKey] and preserves other branches", async () => {
    const localStore = makeStore();

    await hide(ACCOUNT_A, USDC, localStore);
    await hide(ACCOUNT_B, "EURC:GB3Q6", localStore);
    mockNetworkName = MAIN_NET;
    await hide(ACCOUNT_A, "XLM:native", localStore);

    expect(localStore.read()).toEqual({
      [TEST_NET]: {
        [ACCOUNT_A]: { [USDC]: "hidden" },
        [ACCOUNT_B]: { "EURC:GB3Q6": "hidden" },
      },
      [MAIN_NET]: {
        [ACCOUNT_A]: { "XLM:native": "hidden" },
      },
    });
  });

  it("returns the account's leaf, never the whole store", async () => {
    const localStore = makeStore();

    const { hiddenAssets } = await hide(ACCOUNT_A, USDC, localStore);

    expect(hiddenAssets).toEqual({ [USDC]: "hidden" });
    expect(hiddenAssets).not.toHaveProperty(TEST_NET);
  });

  it("treats a pre-migration flat map as empty rather than as visibilities", async () => {
    // A user whose storage version is missing or ahead skips the migration, so
    // the reader has to recognise the old shape itself.
    const localStore = makeStore({
      [HIDDEN_ASSETS]: { [USDC]: "hidden", "EURC:GB3Q6": "visible" },
    });

    expect((await read(ACCOUNT_A, localStore)).hiddenAssets).toEqual({});
  });

  it("does not clobber sibling accounts when writing over a legacy map", async () => {
    const localStore = makeStore({
      [HIDDEN_ASSETS]: { [USDC]: "hidden" },
    });

    await hide(ACCOUNT_A, "EURC:GB3Q6", localStore);

    expect(localStore.read()).toEqual({
      [TEST_NET]: { [ACCOUNT_A]: { "EURC:GB3Q6": "hidden" } },
    });
  });
});
