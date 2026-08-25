import { getAccountBalances, getAccountBalancesV2 } from "../internal";
import {
  FUTURENET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { SERVICE_TYPES } from "@shared/constants/services";
import { captureException } from "@sentry/browser";

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
// A real 56-char StrKey, needed where the scrubber's pattern must actually
// match (PUBLIC_KEY above is a short stand-in that no scrubber would catch).
const REAL_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KJ5JS6ZJ7DHNTGKFEUJ";

// Mirrors the live snake_case wire format of the deployed v2 API.
const v2Account = {
  address: PUBLIC_KEY,
  is_funded: true,
  subentry_count: 2,
  balances: [
    {
      token_type: "NATIVE",
      token_id: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
      key: "native",
      token: { type: "native", code: "XLM" },
      total: "100",
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
      key: "USDC:GISSUER",
      token: {
        type: "credit_alphanum4",
        code: "USDC",
        issuer: { key: "GISSUER" },
      },
      total: "50",
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

const LOCAL_CONTRACT = "CLOCALTOKENCONTRACTID";

// Routes FETCH_BACKEND_V2 messages to the given chokepoint result and lets
// every other message type (getTokenIds on the v1 path, and the local
// custom-token merge on the v2 path) resolve benignly.
const mockBackendV2 = (
  result: { status: number; body: unknown },
  tokenIdList: string[] = [],
) => {
  mockedSend.mockImplementation((msg: { type: SERVICE_TYPES }) => {
    if (msg.type === SERVICE_TYPES.FETCH_BACKEND_V2) {
      return Promise.resolve(result);
    }
    return Promise.resolve({ tokenIdList, error: undefined });
  });
};

// The merge resolves each unreturned contract through the v1 token-details
// endpoint, then the Blockaid scan runs — both are direct fetches.
const mockTokenDetailsAndScan = (
  tokenDetails: unknown,
  scanResults: Record<string, unknown> = {},
) => {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes("/token-details/")) {
      return Promise.resolve({ ok: true, json: async () => tokenDetails });
    }
    return Promise.resolve({
      json: async () => ({ data: { results: scanResults } }),
    });
  });
};

const backendV2Message = () =>
  mockedSend.mock.calls
    .map(([msg]) => msg)
    .find((msg) => msg.type === SERVICE_TYPES.FETCH_BACKEND_V2);

// The Blockaid bulk scan (v1 indexer) is still a direct fetch.
const mockFetch = jest.fn();

const mockedCapture = captureException as jest.Mock;
const capturedMessages = () => mockedCapture.mock.calls.map(([msg]) => msg);

describe("getAccountBalancesV2", () => {
  beforeEach(() => {
    mockedSend.mockReset();
    mockFetch.mockReset();
    mockedCapture.mockReset();
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

    // The thrown Error is never reported (useGetBalances rethrows without a
    // capture, and the ErrorBoundary only reports componentStack), so the
    // response body has to reach Sentry from this capture or not at all.
    expect(capturedMessages()).toEqual([
      'v2 balances response is missing the requested account - 200: {"data":[]}',
    ]);
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

  it("injects a locally saved token the response omits, and scans it", async () => {
    mockBackendV2({ status: 200, body: { data: [v2Account] } }, [
      LOCAL_CONTRACT,
    ]);
    mockTokenDetailsAndScan(
      { name: "My Token", symbol: "TKN", decimals: 7, balance: "0" },
      { [`TKN-${LOCAL_CONTRACT}`]: { result_type: "Spam" } },
    );

    const result = await getAccountBalancesV2({
      publicKey: PUBLIC_KEY,
      networkDetails: MAINNET_NETWORK_DETAILS,
    });

    const detailsCall = mockFetch.mock.calls.find(([url]) =>
      String(url).includes("/token-details/"),
    );
    expect(detailsCall[0]).toContain(LOCAL_CONTRACT);
    expect(detailsCall[0]).toContain("should_fetch_balance=true");

    const entry = result.balances![`TKN:${LOCAL_CONTRACT}`] as any;
    expect(entry.contractId).toBe(LOCAL_CONTRACT);
    expect(entry.total.toString()).toBe("0");
    expect(result.localOnlyTokenIds).toEqual([LOCAL_CONTRACT]);
    // the merge runs before the scan, so injected tokens get verdicts too
    expect(entry.blockaidData).toEqual({ result_type: "Spam" });
  });

  it("reports no local-only tokens when the response already covers them", async () => {
    const v2AccountWithToken = {
      ...v2Account,
      balances: [
        ...v2Account.balances,
        {
          token_type: "SEP41",
          token_id: LOCAL_CONTRACT,
          key: `TKN:${LOCAL_CONTRACT}`,
          token: { code: "TKN", issuer: { key: LOCAL_CONTRACT } },
          total: "5000000000",
          available: "5000000000",
          symbol: "TKN",
          name: "My Token",
          decimals: 7,
        },
      ],
    };
    mockBackendV2({ status: 200, body: { data: [v2AccountWithToken] } }, [
      LOCAL_CONTRACT,
    ]);

    const result = await getAccountBalancesV2({
      publicKey: PUBLIC_KEY,
      networkDetails: TESTNET_NETWORK_DETAILS,
      shouldSkipScan: true,
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.localOnlyTokenIds).toEqual([]);
    expect(result.balances![`TKN:${LOCAL_CONTRACT}`]).toBeDefined();
  });

  it("skips the merge for an unfunded account", async () => {
    mockBackendV2(
      {
        status: 200,
        body: {
          data: [
            {
              address: PUBLIC_KEY,
              is_funded: false,
              subentry_count: 0,
              balances: [],
            },
          ],
        },
      },
      [LOCAL_CONTRACT],
    );

    const result = await getAccountBalancesV2({
      publicKey: PUBLIC_KEY,
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.isFunded).toBe(false);
    expect(result.localOnlyTokenIds).toBeUndefined();
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

    // Status alone can't distinguish a backend outage from a bad request, so
    // the server's explanation has to travel with it.
    expect(capturedMessages()).toEqual([
      'Failed to fetch account balances v2 - 500: {"message":"boom","statusCode":500}',
    ]);
  });

  it("throws on a 200 with no data payload", async () => {
    mockBackendV2({ status: 200, body: {} });

    await expect(
      getAccountBalancesV2({
        publicKey: PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
      }),
    ).rejects.toThrow();

    expect(capturedMessages()).toEqual([
      "Failed to fetch account balances v2 - 200: {}",
    ]);
  });

  it("scrubs addresses out of the reported body", async () => {
    // The failure guard also fires on a 200 whose shape drifted, where `body`
    // is the full address-keyed balances payload. Sentry's beforeSend only
    // rewrites request URLs, never message strings, so the redaction has to
    // happen at the capture site.
    mockBackendV2({
      status: 200,
      body: { accounts: [{ address: REAL_PUBLIC_KEY }] },
    });

    await expect(
      getAccountBalancesV2({
        publicKey: REAL_PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
      }),
    ).rejects.toThrow();

    const [message] = capturedMessages();
    expect(message).toContain("G***");
    expect(message).not.toContain(REAL_PUBLIC_KEY);
  });
});

describe("getAccountBalances routing", () => {
  beforeEach(() => {
    mockedSend.mockReset();
    mockFetch.mockReset();
    global.fetch = mockFetch as any;
  });

  it("routes to v2 when the flag is on and the network is supported", async () => {
    mockBackendV2({ status: 200, body: { data: [v2Account] } });

    await getAccountBalances(
      PUBLIC_KEY,
      TESTNET_NETWORK_DETAILS,
      false,
      undefined,
      true,
    );

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

  it("marks every locally saved contract removable on the v1 path", async () => {
    // v1 returns a contract-token balance only for an ID it was handed, so
    // dropping the local entry is enough to hide it.
    mockBackendV2({ status: 200, body: { data: [] } }, [LOCAL_CONTRACT]);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balances: {}, isFunded: true, subentryCount: 0 }),
    });

    const result = await getAccountBalances(
      PUBLIC_KEY,
      TESTNET_NETWORK_DETAILS,
      false,
      undefined,
      false,
    );

    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(`contract_ids=${LOCAL_CONTRACT}`);
    expect(result.localOnlyTokenIds).toEqual([LOCAL_CONTRACT]);
  });

  it("routes to v1 on Futurenet even with the flag on", async () => {
    mockBackendV2({ status: 200, body: { data: [] } });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ balances: {}, isFunded: true, subentryCount: 0 }),
    });

    await getAccountBalances(
      PUBLIC_KEY,
      FUTURENET_NETWORK_DETAILS,
      false,
      undefined,
      true,
    );

    expect(backendV2Message()).toBeUndefined();
    const [url] = mockFetch.mock.calls[0];
    expect(url).toContain(`/account-balances/${PUBLIC_KEY}`);
  });
});
