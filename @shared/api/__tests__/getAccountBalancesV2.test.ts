import { getAccountBalances, getAccountBalancesV2 } from "../internal";
import {
  FUTURENET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { SERVICE_TYPES } from "@shared/constants/services";
import { sendMessageToBackground } from "../helpers/extensionMessaging";

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));

// The v2 path routes through the FETCH_BACKEND_V2 background chokepoint
// (#2879) via sendMessageToBackground; the v1 path (getAccountIndexerBalances)
// also messages the background for getTokenIds. Mock the messaging layer and
// branch on message type so both paths run outside the extension.
jest.mock("../helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

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

// Account with a scannable classic asset, for the mainnet Blockaid tests.
const v2AccountWithClassic = {
  ...v2Account,
  balances: [
    ...v2Account.balances,
    {
      token_type: "CLASSIC",
      token_id: "CUSDC",
      balance: "50",
      available: "50",
      code: "USDC",
      issuer: "GISSUER",
      type: "credit_alphanum4",
      limit: "1000",
      buying_liabilities: "0",
      selling_liabilities: "0",
      is_authorized: true,
      is_authorized_to_maintain_liabilities: true,
    },
  ],
};

// Routes FETCH_BACKEND_V2 messages to the given chokepoint result and lets
// every other message type (getTokenIds on the v1 path) resolve benignly.
const mockBackendV2 = (result: { status: number; body: unknown }) => {
  mockedSend.mockImplementation((msg: { type: SERVICE_TYPES }) => {
    if (msg.type === SERVICE_TYPES.FETCH_BACKEND_V2) {
      return Promise.resolve(result);
    }
    return Promise.resolve({ tokenIdList: [], error: undefined });
  });
};

const backendV2Message = () =>
  mockedSend.mock.calls
    .map(([msg]) => msg)
    .find((msg) => msg.type === SERVICE_TYPES.FETCH_BACKEND_V2);

// The Blockaid bulk scan (v1 indexer) is still a direct fetch.
const mockFetch = jest.fn();

describe("getAccountBalancesV2", () => {
  beforeEach(() => {
    mockedSend.mockReset();
    mockFetch.mockReset();
    global.fetch = mockFetch as any;
  });

  it("POSTs the address through the v2 chokepoint and maps the response", async () => {
    mockBackendV2({ status: 200, body: { data: [v2Account] } });

    const result = await getAccountBalancesV2({
      publicKey: PUBLIC_KEY,
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    const message = backendV2Message();
    expect(message.method).toBe("POST");
    expect(message.path).toBe("/accounts/balances?network=TESTNET");
    expect(JSON.parse(message.body)).toEqual({ addresses: [PUBLIC_KEY] });

    expect(result.isFunded).toBe(true);
    expect(result.subentryCount).toBe(2);
    expect(result.balances!.native).toBeDefined();
    expect(result.balances!.native.total.toString()).toBe("100");
  });

  it("rejects a response missing the requested account (contract violation)", async () => {
    // The backend always includes unfunded accounts with is_funded=false, so
    // a 200 without the requested address is malformed — mapping it to
    // "unfunded" would render a funded wallet as empty.
    mockBackendV2({ status: 200, body: { data: [] } });

    await expect(
      getAccountBalancesV2({
        publicKey: PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
      }),
    ).rejects.toThrow(
      `v2 balances response is missing the requested account ${PUBLIC_KEY}`,
    );
  });

  it("bulk-scans scannable assets and merges blockaidData on mainnet", async () => {
    mockBackendV2({ status: 200, body: { data: [v2AccountWithClassic] } });
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        data: { results: { "USDC-GISSUER": { result_type: "Spam" } } },
      }),
    });

    const result = await getAccountBalancesV2({
      publicKey: PUBLIC_KEY,
      networkDetails: MAINNET_NETWORK_DETAILS,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [scanUrl] = mockFetch.mock.calls[0];
    expect(scanUrl).toContain("/scan-asset-bulk");
    expect(scanUrl).toContain("USDC-GISSUER");
    expect((result.balances!["USDC:GISSUER"] as any).blockaidData).toEqual({
      result_type: "Spam",
    });
    // native isn't scannable — it gets the benign default
    expect((result.balances!.native as any).blockaidData.result_type).toBe(
      "Benign",
    );
  });

  it("skips the Blockaid scan when shouldSkipScan is true", async () => {
    mockBackendV2({ status: 200, body: { data: [v2AccountWithClassic] } });

    const result = await getAccountBalancesV2({
      publicKey: PUBLIC_KEY,
      networkDetails: MAINNET_NETWORK_DETAILS,
      shouldSkipScan: true,
    });

    expect(mockFetch).not.toHaveBeenCalled();
    // entries still carry the benign default so the payload matches v1
    expect(
      (result.balances!["USDC:GISSUER"] as any).blockaidData.result_type,
    ).toBe("Benign");
  });

  it("throws on a non-200 chokepoint result", async () => {
    mockBackendV2({
      status: 500,
      body: { message: "boom", statusCode: 500 },
    });

    await expect(
      getAccountBalancesV2({
        publicKey: PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
      }),
    ).rejects.toThrow();
  });

  it("throws on a 200 with no data payload", async () => {
    mockBackendV2({ status: 200, body: {} });

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
    mockedSend.mockReset();
    mockFetch.mockReset();
    global.fetch = mockFetch as any;
  });

  it("routes to v2 by default on a supported network", async () => {
    mockBackendV2({ status: 200, body: { data: [v2Account] } });

    await getAccountBalances(PUBLIC_KEY, TESTNET_NETWORK_DETAILS, false);

    const message = backendV2Message();
    expect(message).toBeDefined();
    expect(message.path).toContain("/accounts/balances");
  });

  it("routes to v1 when the flag is off", async () => {
    mockBackendV2({ status: 200, body: { data: [] } });
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

    expect(backendV2Message()).toBeUndefined();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(`/account-balances/${PUBLIC_KEY}`);
  });

  it("routes to v1 on Futurenet even with the flag on", async () => {
    mockBackendV2({ status: 200, body: { data: [] } });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balances: {}, isFunded: true, subentryCount: 0 }),
    });

    await getAccountBalances(PUBLIC_KEY, FUTURENET_NETWORK_DETAILS, false);

    expect(backendV2Message()).toBeUndefined();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(`/account-balances/${PUBLIC_KEY}`);
  });
});
