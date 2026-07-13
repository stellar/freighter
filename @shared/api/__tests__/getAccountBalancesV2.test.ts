import { getAccountBalances, getAccountBalancesV2 } from "../internal";
import {
  FUTURENET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

// getAccountIndexerBalances (the v1 path) calls getTokenIds, which messages
// the background script — stub the messaging layer so the v1 routing tests
// can run outside the extension.
jest.mock("../helpers/extensionMessaging", () => ({
  sendMessageToBackground: jest
    .fn()
    .mockResolvedValue({ tokenIdList: [], error: undefined }),
}));

const PUBLIC_KEY = "GACCOUNTPUBLICKEY";

// Mirrors the live snake_case wire format of the deployed v2 API.
const v2Account = {
  address: PUBLIC_KEY,
  is_funded: true,
  subentry_count: 2,
  balances: [
    {
      token_type: "NATIVE",
      token_id: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
      balance: "100",
      available: "98.5",
      minimum_balance: "1.5",
      buying_liabilities: "0",
      selling_liabilities: "0",
    },
  ],
};

const mockFetch = jest.fn();

describe("getAccountBalancesV2", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as any;
  });

  it("POSTs the address to the v2 endpoint and maps the response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [v2Account] }),
    });

    const result = await getAccountBalancesV2({
      publicKey: PUBLIC_KEY,
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe(
      "http://localhost:3003/api/v1/accounts/balances?network=TESTNET",
    );
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ addresses: [PUBLIC_KEY] });

    expect(result.isFunded).toBe(true);
    expect(result.subentryCount).toBe(2);
    expect(result.balances!.native).toBeDefined();
    expect(result.balances!.native.total.toString()).toBe("100");
  });

  it("maps a missing account in the fan-out result as unfunded", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const result = await getAccountBalancesV2({
      publicKey: PUBLIC_KEY,
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    expect(result.isFunded).toBe(false);
    expect(result.balances).toEqual({});
  });

  it("throws on a non-OK response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: async () => JSON.stringify({ message: "boom", statusCode: 500 }),
    });

    await expect(
      getAccountBalancesV2({
        publicKey: PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
      }),
    ).rejects.toThrow();
  });
});

describe("getAccountBalances routing", () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as any;
  });

  it("routes to v2 by default on a supported network", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [v2Account] }),
    });

    await getAccountBalances(PUBLIC_KEY, TESTNET_NETWORK_DETAILS, false);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain("/accounts/balances");
  });

  it("routes to v1 when the flag is off", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balances: {}, isFunded: true, subentryCount: 0 }),
    });

    await getAccountBalances(
      PUBLIC_KEY,
      TESTNET_NETWORK_DETAILS,
      false,
      undefined,
      false,
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(`/account-balances/${PUBLIC_KEY}`);
  });

  it("routes to v1 on Futurenet even with the flag on", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balances: {}, isFunded: true, subentryCount: 0 }),
    });

    await getAccountBalances(PUBLIC_KEY, FUTURENET_NETWORK_DETAILS, false);

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(`/account-balances/${PUBLIC_KEY}`);
  });
});
