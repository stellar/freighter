import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { RESET_WALLET_KEEP_LIST } from "background/messageListener/handlers/resetWallet";
import { broadcastSessionState } from "background/messageListener/helpers/broadcast-session-state";
import {
  mockDataStorage,
  mockKeyManager,
  mockSessionStore,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import { SERVICE_TYPES } from "@shared/constants/services";
import * as storageKeys from "constants/localStorageTypes";
import {
  ACCOUNT_NAME_LIST_ID,
  ALLOWLIST_ID,
  APPLICATION_ID,
  ASSETS_LISTS_ID,
  AUTO_LOCK_TIMEOUT_MINUTES_ID,
  CACHED_ASSET_DOMAINS_ID,
  CACHED_ASSET_ICONS_ID,
  CACHED_MEMO_REQUIRED_ACCOUNTS_ID,
  CACHED_SWAP_TOP_TOKENS_ID,
  COLLECTIBLES_ID,
  DATA_SHARING_ID,
  HAS_ACCOUNT_SUBSCRIPTION,
  HAS_SEEN_DISCOVER_WELCOME,
  HIDDEN_ASSETS,
  HIDDEN_COLLECTIBLES,
  IS_BLOCKAID_ANNOUNCED_ID,
  IS_EXPERIMENTAL_MODE_ID,
  IS_HASH_SIGNING_ENABLED_ID,
  IS_HIDE_DUST_ENABLED_ID,
  IS_NON_SSL_ENABLED_ID,
  IS_OPEN_SIDEBAR_BY_DEFAULT_ID,
  IS_VALIDATING_MEMO_ID,
  KEY_DERIVATION_NUMBER_ID,
  KEY_ID,
  KEY_ID_LIST,
  LAST_USED_ACCOUNT,
  METRICS_DATA,
  METRICS_USER_ID,
  NETWORK_ID,
  NETWORKS_LIST_ID,
  OVERRIDDEN_BLOCKAID_RESPONSE_ID,
  REBRAND_ANNOUNCEMENT_STATUS_ID,
  RECENT_ADDRESSES,
  RECENT_PROTOCOLS,
  STORAGE_VERSION,
  TEMPORARY_STORE_EXTRA_ID,
  TEMPORARY_STORE_ID,
  TOKEN_ID_LIST,
  USDT0_LAUNCH_BANNER_DISMISSED,
} from "constants/localStorageTypes";

jest.mock("stellar-hd-wallet", () => ({
  generateMnemonic: () => "mocked mnemonic phrase",
  fromMnemonic: () => ({
    getPublicKey: (_: number) => "pubKey",
    getSecret: (_: number) => "secret",
  }),
}));

jest.mock("background/messageListener/helpers/broadcast-session-state", () => ({
  broadcastSessionState: jest.fn(),
}));

const PASSWORD = "test";
const HW_KEY_ID = "hw:GHWACCOUNT";

// A message from one of our own extension pages: no tab, no foreign
// extension id. (`browser` is an empty mock in Jest, so `runtime.id` is
// undefined.)
const EXTENSION_PAGE_SENDER = {};
// Our content script relaying a web page's message: it carries the page's
// tab and URL.
const CONTENT_SCRIPT_SENDER = { tab: { id: 7 }, url: "https://dapp.example/" };

const APP_SETTINGS: Record<string, unknown> = {
  [NETWORK_ID]: { network: "TESTNET" },
  [NETWORKS_LIST_ID]: [{ network: "TESTNET" }, { network: "MY_NETWORK" }],
  [ASSETS_LISTS_ID]: { TESTNET: [] },
  [STORAGE_VERSION]: "5.33.5",
  [DATA_SHARING_ID]: true,
  [IS_VALIDATING_MEMO_ID]: true,
  [IS_HIDE_DUST_ENABLED_ID]: false,
  [IS_OPEN_SIDEBAR_BY_DEFAULT_ID]: true,
  // Minutes. Shorter than the 12-hour default, so a reset that erased it
  // would lengthen it.
  [AUTO_LOCK_TIMEOUT_MINUTES_ID]: 5,
  [IS_EXPERIMENTAL_MODE_ID]: false,
  [IS_HASH_SIGNING_ENABLED_ID]: true,
  [IS_NON_SSL_ENABLED_ID]: false,
  [OVERRIDDEN_BLOCKAID_RESPONSE_ID]: "malicious",
};

// Everything else tied to the old wallet, including what today's overwrite
// flow leaves behind (hardware-wallet entries, keystores orphaned by account
// migration) and a legacy key from an older version.
const OLD_WALLET_DATA: Record<string, unknown> = {
  [HW_KEY_ID]: { publicKey: "GHWACCOUNT", bipPath: "44'/148'/1'" },
  "stellarkeys:orphaned-by-migration": { encryptedBlob: "old" },
  [ALLOWLIST_ID]: { Testnet: { pubKey: ["dapp.example"] } },
  [COLLECTIBLES_ID]: { TESTNET: { pubKey: [] } },
  [HAS_ACCOUNT_SUBSCRIPTION]: { [HW_KEY_ID]: true },
  [HIDDEN_ASSETS]: { "USDC:GISSUER": "hidden" },
  [HIDDEN_COLLECTIBLES]: { "collection:1": "hidden" },
  [RECENT_PROTOCOLS]: [{ websiteUrl: "https://dapp.example", lastAccessed: 1 }],
  [RECENT_ADDRESSES]: ["GRECENT"],
  [LAST_USED_ACCOUNT]: "pubKey",
  [TOKEN_ID_LIST]: { TESTNET: { someKeyId: ["CTOKEN"] } },
  [CACHED_ASSET_ICONS_ID]: { "USDC:GISSUER": "https://icon.example" },
  [CACHED_ASSET_DOMAINS_ID]: { "USDC:GISSUER": "centre.io" },
  [CACHED_SWAP_TOP_TOKENS_ID]: [],
  [CACHED_MEMO_REQUIRED_ACCOUNTS_ID]: [],
  [`${CACHED_MEMO_REQUIRED_ACCOUNTS_ID}_date`]: 1,
  [USDT0_LAUNCH_BANNER_DISMISSED]: true,
  [HAS_SEEN_DISCOVER_WELCOME]: true,
  [IS_BLOCKAID_ANNOUNCED_ID]: true,
  [REBRAND_ANNOUNCEMENT_STATUS_ID]: "pending",
  isTestnet: true,
};

const sessionTimer = new MockBrowserAlarm(() => {});

const send = (
  request: Record<string, unknown>,
  sender: object = EXTENSION_PAGE_SENDER,
) =>
  popupMessageListener(
    { activePublicKey: "", ...request } as any,
    mockSessionStore,
    mockDataStorage,
    mockKeyManager,
    sessionTimer as any,
    sender,
  );

const requestReset = (sender?: object) =>
  send({ type: SERVICE_TYPES.RESET_WALLET }, sender);

// A real wallet (created through the same handler the app uses), plus the
// settings and leftovers a long-lived install accumulates.
const setUpWalletWithLeftovers = async () => {
  await send({
    type: SERVICE_TYPES.CREATE_ACCOUNT,
    password: PASSWORD,
    isOverwritingAccount: false,
  });
  mockSessionStore.dispatch(
    sessionSlice.actions.setMigratedMnemonicPhrase({
      migratedMnemonicPhrase: "old phrase",
    }),
  );
  await mockStorageApi.set({ ...APP_SETTINGS, ...OLD_WALLET_DATA });
};

describe("RESET_WALLET", () => {
  beforeEach(async () => {
    await mockStorageApi.clear();
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    jest.mocked(broadcastSessionState).mockClear();
    mockStorageApi.remove.mockClear();
  });

  it("erases all wallet data and keeps only the app settings", async () => {
    await setUpWalletWithLeftovers();
    expect(await mockDataStorage.getItem(KEY_ID_LIST)).toHaveLength(1);

    const response = await requestReset();

    expect(response).toEqual({});
    expect(await mockStorageApi.get(null)).toEqual(APP_SETTINGS);
  });

  it("keeps the auto-lock timeout, so a reset can't lengthen it to the 12-hour default", async () => {
    await setUpWalletWithLeftovers();

    await requestReset();

    expect(await mockDataStorage.getItem(AUTO_LOCK_TIMEOUT_MINUTES_ID)).toBe(5);
  });

  it("ends the session the way Log Out does", async () => {
    await setUpWalletWithLeftovers();
    const stopsBefore = sessionTimer.stopCount;

    await requestReset();

    const { session } = mockSessionStore.getState();
    expect(sessionTimer.stopCount).toBe(stopsBefore + 1);
    expect(session.publicKey).toBe("");
    expect(session.allAccounts).toEqual([]);
    expect(session.hashKey?.key).toBe("");
    expect(session.migratedMnemonicPhrase).toBe("");
    expect(session.isHardwareWalletLocked).toBe(true);
    expect(broadcastSessionState).toHaveBeenCalledWith(
      SERVICE_TYPES.SESSION_LOCKED,
    );
  });

  it("removes applicationState last", async () => {
    await setUpWalletWithLeftovers();
    mockStorageApi.remove.mockClear();

    await requestReset();

    const removed = mockStorageApi.remove.mock.calls.map(([keys]) =>
      [keys].flat(),
    );
    expect(removed[removed.length - 1]).toEqual([APPLICATION_ID]);
    removed
      .slice(0, -1)
      .forEach((keys) => expect(keys).not.toContain(APPLICATION_ID));
  });

  it("stays locked but onboarded when erasing fails, and a retry finishes the job", async () => {
    await setUpWalletWithLeftovers();
    mockStorageApi.remove.mockRejectedValueOnce(new Error("disk full"));

    const failed = await requestReset();

    expect(failed).toEqual({ error: "Failed to reset wallet" });
    expect(await mockDataStorage.getItem(APPLICATION_ID)).toBeTruthy();
    expect(mockSessionStore.getState().session.hashKey?.key).toBe("");

    const retried = await requestReset();

    expect(retried).toEqual({});
    expect(await mockStorageApi.get(null)).toEqual(APP_SETTINGS);
  });

  it("leaves nothing that a lock screen still open elsewhere can unlock", async () => {
    await setUpWalletWithLeftovers();
    await requestReset();
    const storageAfterReset = await mockStorageApi.get(null);

    const account = await send({ type: SERVICE_TYPES.LOAD_ACCOUNT });
    const unlock = await send({
      type: SERVICE_TYPES.CONFIRM_PASSWORD,
      password: PASSWORD,
    });

    expect(account).toMatchObject({
      publicKey: "",
      hasPrivateKey: false,
      applicationState: "",
    });
    expect(unlock).toEqual({ error: "Incorrect password" });
    expect(await mockStorageApi.get(null)).toEqual(storageAfterReset);
  });

  it("reports no unlocked wallet when the active account was a hardware wallet", async () => {
    await setUpWalletWithLeftovers();
    await mockStorageApi.set({ [KEY_ID]: HW_KEY_ID });

    await requestReset();
    const account = await send({ type: SERVICE_TYPES.LOAD_ACCOUNT });

    expect(account).toMatchObject({ publicKey: "", hasPrivateKey: false });
    expect(await mockDataStorage.getItem(HW_KEY_ID)).toBeUndefined();
  });

  it("refuses requests that don't come from an extension page", async () => {
    await setUpWalletWithLeftovers();
    const storageBefore = await mockStorageApi.get(null);
    const stopsBefore = sessionTimer.stopCount;

    const response = await requestReset(CONTENT_SCRIPT_SENDER);

    expect(response).toEqual({ error: "Unauthorized" });
    expect(await mockStorageApi.get(null)).toEqual(storageBefore);
    expect(sessionTimer.stopCount).toBe(stopsBefore);
    expect(mockSessionStore.getState().session.publicKey).toBe("pubKey");
  });

  it("classifies every storage key constant as kept, erased, or not a storage.local key", () => {
    // Erased by the reset's sweep. A new per-wallet key belongs here; a new
    // app setting belongs in RESET_WALLET_KEEP_LIST instead.
    const erased = [
      ACCOUNT_NAME_LIST_ID,
      ALLOWLIST_ID,
      APPLICATION_ID,
      CACHED_ASSET_DOMAINS_ID,
      CACHED_ASSET_ICONS_ID,
      CACHED_MEMO_REQUIRED_ACCOUNTS_ID,
      CACHED_SWAP_TOP_TOKENS_ID,
      COLLECTIBLES_ID,
      HAS_ACCOUNT_SUBSCRIPTION,
      HAS_SEEN_DISCOVER_WELCOME,
      HIDDEN_ASSETS,
      HIDDEN_COLLECTIBLES,
      IS_BLOCKAID_ANNOUNCED_ID,
      KEY_DERIVATION_NUMBER_ID,
      KEY_ID,
      KEY_ID_LIST,
      LAST_USED_ACCOUNT,
      // Whether this wallet is still owed the rebrand announcement. Create and
      // import mark it seen, so the next wallet never gets it either way.
      REBRAND_ANNOUNCEMENT_STATUS_ID,
      RECENT_ADDRESSES,
      RECENT_PROTOCOLS,
      TEMPORARY_STORE_ID,
      TOKEN_ID_LIST,
      USDT0_LAUNCH_BANNER_DISMISSED,
    ];
    // Not top-level browser.storage.local keys: the metrics keys live in page
    // localStorage, and TEMPORARY_STORE_EXTRA_ID is nested in temporaryStore.
    const notInStorageLocal = [
      METRICS_DATA,
      METRICS_USER_ID,
      TEMPORARY_STORE_EXTRA_ID,
    ];
    const allConstants = (Object.values(storageKeys) as unknown[]).filter(
      (value): value is string => typeof value === "string",
    );

    expect(
      [...RESET_WALLET_KEEP_LIST, ...erased, ...notInStorageLocal].sort(),
    ).toEqual(allConstants.sort());
  });
});
