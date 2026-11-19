// The real funding-record storage, with the emit and the Identify sync
// replaced, so the tests can read what the detection does.
jest.mock("helpers/metrics", () => {
  const actual = jest.requireActual("helpers/metrics");
  return {
    ...actual,
    emitMetric: jest.fn(() => true),
    syncIdentifyTraits: jest.fn(),
  };
});
jest.mock("popup/App", () => ({
  store: { getState: jest.fn(() => ({})), subscribe: jest.fn() },
}));
jest.mock("popup/ducks/accountServices", () => ({
  publicKeySelector: jest.fn(),
  allAccountsSelector: jest.fn(() => []),
}));
jest.mock("popup/ducks/settings", () => ({
  settingsDataSharingSelector: jest.fn(() => true),
  settingsNetworkDetailsSelector: jest.fn(),
}));
jest.mock("@amplitude/analytics-browser");
jest.mock("constants/env", () => ({
  AMPLITUDE_KEY: "test-key",
  APP_VERSION: "9.9.9",
}));

import BigNumber from "bignumber.js";

import { AssetType } from "@shared/api/types/account-balance";
import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import {
  AccountValueInput,
  onAccountValue,
  onListAccountValue,
  toFunded,
} from "helpers/accountFunding";
import {
  emitMetric,
  getFundedAccountCount,
  getFundingRecord,
  syncIdentifyTraits,
} from "helpers/metrics";
import {
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { METRICS_DATA } from "constants/localStorageTypes";

const KEY_A = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const KEY_B = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC = `USDC:${USDC_ISSUER}`;
const FOO = `FOO:${USDC_ISSUER}`;

const xlm = (total: string) =>
  ({
    token: { type: "native", code: "XLM" },
    total: new BigNumber(total),
    available: new BigNumber(total),
  }) as unknown as AssetType;

const classic = (code: string, total: string) =>
  ({
    token: {
      type: "credit_alphanum4",
      code,
      issuer: { key: USDC_ISSUER },
    },
    total: new BigNumber(total),
    available: new BigNumber(total),
  }) as unknown as AssetType;

const PRICES = {
  native: { currentPrice: "0.1" },
  [USDC]: { currentPrice: "1" },
};

const input = (
  overrides: Partial<AccountValueInput> = {},
): AccountValueInput => ({
  isFunded: true,
  balances: [xlm("10")],
  tokenPrices: PRICES,
  hasBalanceError: false,
  ...overrides,
});

const FUNDED = input();
const UNFUNDED = input({ balances: [xlm("0")] });

const setActive = (
  publicKey: string,
  networkDetails = MAINNET_NETWORK_DETAILS,
) => {
  (publicKeySelector as unknown as jest.Mock).mockReturnValue(publicKey);
  (settingsNetworkDetailsSelector as unknown as jest.Mock).mockReturnValue(
    networkDetails,
  );
};

const activeValue = (
  value: AccountValueInput,
  publicKey = KEY_A,
  networkDetails = MAINNET_NETWORK_DETAILS,
) => onAccountValue({ publicKey, networkDetails, input: value });

const listValue = (
  value: AccountValueInput,
  publicKey = KEY_B,
  networkDetails = MAINNET_NETWORK_DETAILS,
) =>
  onListAccountValue({
    publicKey,
    networkDetails,
    allAccounts: [{ publicKey: KEY_A }, { publicKey: KEY_B }] as never,
    input: value,
  });

const fundedEvents = () =>
  (emitMetric as jest.Mock).mock.calls.filter(
    ([name]) => name === METRIC_NAMES.accountFunded,
  );

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  (emitMetric as jest.Mock).mockReturnValue(true);
  (allAccountsSelector as unknown as jest.Mock).mockReturnValue([
    { publicKey: KEY_A },
    { publicKey: KEY_B },
  ]);
  setActive(KEY_A);
});

describe("toFunded", () => {
  it("is unfunded when the account has no ledger entry", () => {
    expect(toFunded(input({ isFunded: false, tokenPrices: null }))).toBe(false);
  });

  it("gives no result when the balance fetch failed or isFunded is null (VT-4)", () => {
    expect(toFunded(input({ hasBalanceError: true }))).toBeNull();
    expect(toFunded(input({ isFunded: null }))).toBeNull();
  });

  it("gives no result when the price fetch failed or did not run (VT-5)", () => {
    expect(toFunded(input({ tokenPrices: null }))).toBeNull();
    expect(toFunded(input({ tokenPrices: undefined }))).toBeNull();
  });

  it("gives no result for XLM above zero with no XLM price (VT-6)", () => {
    expect(
      toFunded(input({ tokenPrices: { [USDC]: { currentPrice: "1" } } })),
    ).toBeNull();
    expect(toFunded(input({ tokenPrices: { native: null } }))).toBeNull();
  });

  it("is unfunded when isFunded is true and every priced balance is zero (VT-7)", () => {
    expect(
      toFunded(input({ balances: [xlm("0"), classic("USDC", "0")] })),
    ).toBe(false);
  });

  it("is funded with zero XLM and a priced USDC balance (VT-8)", () => {
    expect(
      toFunded(
        input({
          balances: [xlm("0"), classic("USDC", "5")],
          tokenPrices: { [USDC]: { currentPrice: "1" } },
        }),
      ),
    ).toBe(true);
  });

  it("is unfunded when only an unpriced token is above zero (VT-9)", () => {
    expect(
      toFunded(input({ balances: [xlm("0"), classic("FOO", "100")] })),
    ).toBe(false);
    expect(PRICES).not.toHaveProperty(FOO);
  });

  it("is unfunded when the only value is in a hidden token (VT-10)", () => {
    // The callers pass the balances without hidden tokens, so a hidden USDC
    // balance does not reach this function.
    expect(toFunded(input({ balances: [xlm("0")] }))).toBe(false);
  });

  it("uses BigNumber, so a tiny value still counts", () => {
    expect(
      toFunded(
        input({
          balances: [xlm("0.0000001")],
          tokenPrices: { native: { currentPrice: "0.0000001" } },
        }),
      ),
    ).toBe(true);
  });
});

describe("onAccountValue", () => {
  it("emits one event for an unfunded result, then a funded result (VT-1)", () => {
    activeValue(UNFUNDED);
    expect(fundedEvents()).toHaveLength(0);
    activeValue(FUNDED);
    expect(fundedEvents()).toHaveLength(1);
    expect(getFundingRecord("PUBLIC", KEY_A)).toEqual({
      status: "funded",
      funded: true,
    });
  });

  it("emits no event for a funded result on first sight (VT-2, VT-21)", () => {
    activeValue(FUNDED);
    expect(fundedEvents()).toHaveLength(0);
    expect(getFundingRecord("PUBLIC", KEY_A)).toEqual({
      status: "funded",
      funded: true,
    });
    expect(
      getFundedAccountCount(
        [{ publicKey: KEY_A }] as never,
        JSON.parse(localStorage.getItem(METRICS_DATA)!).fundingRecords,
      ),
    ).toBe(1);
    expect(syncIdentifyTraits).toHaveBeenCalled();
  });

  it("emits no second event for repeated funded results (VT-3)", () => {
    activeValue(UNFUNDED);
    activeValue(FUNDED);
    activeValue(FUNDED);
    activeValue(FUNDED);
    expect(fundedEvents()).toHaveLength(1);
  });

  it("changes no record for a result that is not definite (VT-4, VT-5, VT-6)", () => {
    activeValue(UNFUNDED);
    activeValue(input({ hasBalanceError: true }));
    activeValue(input({ isFunded: null }));
    activeValue(input({ tokenPrices: null }));
    activeValue(input({ tokenPrices: { [USDC]: { currentPrice: "1" } } }));
    expect(fundedEvents()).toHaveLength(0);
    expect(getFundingRecord("PUBLIC", KEY_A)).toEqual({
      status: "unfunded",
      funded: false,
    });
  });

  it("does nothing on testnet (VT-11, VT-28)", () => {
    setActive(KEY_A, TESTNET_NETWORK_DETAILS);
    activeValue(UNFUNDED, KEY_A, TESTNET_NETWORK_DETAILS);
    activeValue(FUNDED, KEY_A, TESTNET_NETWORK_DETAILS);
    expect(fundedEvents()).toHaveLength(0);
    expect(localStorage.getItem(METRICS_DATA)).toBeNull();
    expect(syncIdentifyTraits).not.toHaveBeenCalled();
  });

  it("ignores data for an account that is not active (VT-12, VT-13)", () => {
    activeValue(UNFUNDED);
    // The user switched to B before A's data arrived.
    setActive(KEY_B);
    activeValue(FUNDED, KEY_A);
    expect(fundedEvents()).toHaveLength(0);
    expect(getFundingRecord("PUBLIC", KEY_A)).toEqual({
      status: "unfunded",
      funded: false,
    });
  });

  it("ignores data when the active network changed before the data arrived (VT-13)", () => {
    activeValue(UNFUNDED);
    setActive(KEY_A, TESTNET_NETWORK_DETAILS);
    activeValue(FUNDED);
    expect(fundedEvents()).toHaveLength(0);
  });

  it("sets pending when analytics is disabled, then emits after it is enabled (VT-15)", () => {
    activeValue(UNFUNDED);
    (emitMetric as jest.Mock).mockReturnValue(false);
    activeValue(FUNDED);
    expect(getFundingRecord("PUBLIC", KEY_A)?.status).toBe("pending");

    (emitMetric as jest.Mock).mockClear();
    (emitMetric as jest.Mock).mockReturnValue(true);
    activeValue(FUNDED);
    expect(fundedEvents()).toHaveLength(1);
    expect(getFundingRecord("PUBLIC", KEY_A)?.status).toBe("funded");
  });

  it("emits one event for two back-to-back updates (VT-16)", () => {
    activeValue(UNFUNDED);
    // localStorage is synchronous, so the second update reads the first one's
    // write.
    activeValue(FUNDED);
    activeValue(FUNDED);
    expect(fundedEvents()).toHaveLength(1);
  });

  it("emits again for funded, then unfunded, then funded (VT-18)", () => {
    activeValue(UNFUNDED);
    activeValue(FUNDED);
    activeValue(UNFUNDED);
    activeValue(FUNDED);
    expect(fundedEvents()).toHaveLength(2);
  });

  it("works for every account type (FR-17)", () => {
    // The detection does not read the account type.
    (allAccountsSelector as unknown as jest.Mock).mockReturnValue([
      { publicKey: KEY_A, hardwareWalletType: "Ledger" },
    ]);
    activeValue(UNFUNDED);
    activeValue(FUNDED);
    expect(fundedEvents()).toHaveLength(1);
  });
});

describe("onListAccountValue", () => {
  it("changes funded, not status, and emits no event (VT-22)", () => {
    listValue(UNFUNDED);
    listValue(FUNDED);
    expect(fundedEvents()).toHaveLength(0);
    expect(getFundingRecord("PUBLIC", KEY_B)).toEqual({ funded: true });
    expect(syncIdentifyTraits).toHaveBeenCalled();
  });

  it("keeps the status from the active-account fetch", () => {
    setActive(KEY_B);
    activeValue(UNFUNDED, KEY_B);
    listValue(FUNDED);
    expect(getFundingRecord("PUBLIC", KEY_B)).toEqual({
      status: "unfunded",
      funded: true,
    });
  });

  it("emits no event when the user selects an account that the list saw first (VT-23)", () => {
    listValue(UNFUNDED);
    setActive(KEY_B);
    activeValue(FUNDED, KEY_B);
    expect(fundedEvents()).toHaveLength(0);
    expect(getFundingRecord("PUBLIC", KEY_B)).toEqual({
      status: "funded",
      funded: true,
    });
  });

  it("lowers the count when an account becomes unfunded (VT-24)", () => {
    listValue(FUNDED, KEY_A);
    listValue(FUNDED, KEY_B);
    const count = () =>
      getFundedAccountCount(
        [{ publicKey: KEY_A }, { publicKey: KEY_B }] as never,
        JSON.parse(localStorage.getItem(METRICS_DATA)!).fundingRecords,
      );
    expect(count()).toBe(2);
    listValue(UNFUNDED, KEY_B);
    expect(count()).toBe(1);
  });

  it("changes no record for a result that is not definite (VT-27)", () => {
    listValue(input({ hasBalanceError: true }));
    listValue(input({ tokenPrices: null }));
    expect(getFundingRecord("PUBLIC", KEY_B)).toBeUndefined();
  });

  it("ignores testnet results and accounts that are not own accounts (VT-28)", () => {
    listValue(FUNDED, KEY_B, TESTNET_NETWORK_DETAILS);
    const stranger = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";
    listValue(FUNDED, stranger);
    expect(localStorage.getItem(METRICS_DATA)).toBeNull();
  });
});
