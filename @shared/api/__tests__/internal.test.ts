import { Networks } from "stellar-sdk";
import {
  FUTURENET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import * as GetLedgerKeyAccounts from "../helpers/getLedgerKeyAccounts";
import * as internalApi from "../internal";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { SERVICE_TYPES } from "@shared/constants/services";
import { makeHistory } from "./fixtures/tokenPriceHistory";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

describe("internalApi", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  describe("signing wrappers surface failure", () => {
    // The background answers with `{ error }` rather than throwing. These
    // wrappers used to discard both that answer and any transport exception,
    // so a failed signing resolved like a success and telemetry recorded an
    // approval that never happened.
    const SIGNERS = [
      [
        "signTransaction",
        () => internalApi.signTransaction({ activePublicKey: "G1", uuid: "u" }),
      ],
      [
        "signBlob",
        () => internalApi.signBlob({ activePublicKey: "G1", uuid: "u" }),
      ],
      [
        "signAuthEntry",
        () => internalApi.signAuthEntry({ activePublicKey: "G1", uuid: "u" }),
      ],
      [
        "handleSignedHwPayload",
        () =>
          internalApi.handleSignedHwPayload({ signedPayload: "x", uuid: "u" }),
      ],
    ] as const;

    it.each(SIGNERS)(
      "%s rejects when the background reports an error",
      async (_name, call) => {
        mockedSend.mockResolvedValue({ error: "Transaction not found" });

        await expect(call()).rejects.toThrow("Transaction not found");
      },
    );

    it.each(SIGNERS)(
      "%s rejects when the message transport throws",
      async (_name, call) => {
        mockedSend.mockRejectedValue(new Error("Receiving end does not exist"));

        await expect(call()).rejects.toThrow("Receiving end does not exist");
      },
    );

    it.each(SIGNERS)("%s resolves on success", async (_name, call) => {
      mockedSend.mockResolvedValue({});

      await expect(call()).resolves.toBeUndefined();
    });
  });

  describe("resetWallet", () => {
    // `{}` is the only answer that means "the wallet is erased". Every other
    // outcome must resolve `{ error }` instead, and none may reject.
    it("sends RESET_WALLET with no active public key and resolves {} when the background confirms", async () => {
      mockedSend.mockResolvedValue({});

      await expect(internalApi.resetWallet()).resolves.toEqual({});

      expect(mockedSend).toHaveBeenCalledTimes(1);
      expect(mockedSend).toHaveBeenCalledWith({
        activePublicKey: null,
        type: SERVICE_TYPES.RESET_WALLET,
      });
    });

    it("passes the background's error through", async () => {
      mockedSend.mockResolvedValue({ error: "Failed to reset wallet" });

      await expect(internalApi.resetWallet()).resolves.toEqual({
        error: "Failed to reset wallet",
      });
    });

    // `browser.runtime.sendMessage` resolves `undefined` instead of rejecting
    // when the port closes without a reply, e.g. the MV3 service worker was
    // terminated mid-reset. The outcome is unknown, so it must not read as
    // success.
    it.each([[undefined], [null]])(
      "resolves an error, not success, when the background sends no reply (%s)",
      async (noReply) => {
        mockedSend.mockResolvedValue(noReply);

        await expect(internalApi.resetWallet()).resolves.toEqual({
          error: "No response from background",
        });
      },
    );

    it("resolves the error's message instead of rejecting when the send throws", async () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      mockedSend.mockRejectedValue(new Error("Receiving end does not exist"));

      await expect(internalApi.resetWallet()).resolves.toEqual({
        error: "Receiving end does not exist",
      });
      expect(consoleError).toHaveBeenCalledTimes(1);
    });

    it("stringifies a non-Error rejection", async () => {
      jest.spyOn(console, "error").mockImplementation(() => undefined);
      mockedSend.mockRejectedValue("port closed");

      await expect(internalApi.resetWallet()).resolves.toEqual({
        error: "port closed",
      });
    });
  });

  describe("getAssetDomains", () => {
    it("should return a list of domains from a list of issuers", async () => {
      jest
        .spyOn(GetLedgerKeyAccounts, "getLedgerKeyAccounts")
        .mockResolvedValue({
          G1: {
            account_id:
              "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
            home_domain: "stellar1.org",
            balance: "1000000000000000000",
            seq_num: 1,
            num_sub_entries: 1,
            inflation_dest: "G1",
            flags: 1,
            thresholds: "1000000000000000000",
            signers: [
              {
                key: "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                weight: 1,
              },
            ],
            sequence_number: 1,
          },
          G2: {
            account_id:
              "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
            home_domain: "stellar2.org",
            balance: "1000000000000000000",
            seq_num: 1,
            num_sub_entries: 1,
            inflation_dest:
              "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
            flags: 1,
            thresholds: "1000000000000000000",
            signers: [
              {
                key: "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
                weight: 1,
              },
            ],
            sequence_number: 1,
          },
        });
      const assetDomains = await internalApi.getAssetDomains({
        assetIssuerDomainsToFetch: [
          "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
          "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
        ],
        networkDetails: TESTNET_NETWORK_DETAILS,
      });

      expect(assetDomains).toEqual({
        G1: "stellar1.org",
        G2: "stellar2.org",
      });
    });
    it("should return an empty object if the fetch fails", async () => {
      jest
        .spyOn(GetLedgerKeyAccounts, "getLedgerKeyAccounts")
        .mockRejectedValue(new Error("Fetch failed"));
      const assetDomains = await internalApi.getAssetDomains({
        assetIssuerDomainsToFetch: ["G1", "G2"],
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      expect(assetDomains).toEqual({});
    });
    it("should return an empty object if not valid public keys are provided", async () => {
      const getLedgerKeyAccountsSpy = jest.spyOn(
        GetLedgerKeyAccounts,
        "getLedgerKeyAccounts",
      );
      const assetDomains = await internalApi.getAssetDomains({
        assetIssuerDomainsToFetch: [
          "CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
        ],
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      expect(getLedgerKeyAccountsSpy).not.toHaveBeenCalled();
      expect(assetDomains).toEqual({});
    });
  });

  describe("simulateTokenTransfer", () => {
    it("includes the fee in stroops in the indexer request body", async () => {
      const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          preparedTransaction: "prepared-xdr",
          simulationResponse: { minResourceFee: "100" },
        }),
      } as unknown as Response);

      await internalApi.simulateTokenTransfer({
        address: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
        publicKey: "GBRPYHIL2C2FCU5RNBJQ3WXZH4E2LQ7H5GIPQKNORRACV4W6F6C4P4W5",
        memo: "memo",
        params: {
          publicKey: "GBRPYHIL2C2FCU5RNBJQ3WXZH4E2LQ7H5GIPQKNORRACV4W6F6C4P4W5",
          destination:
            "GDQP2KPQGKIHYJGXNUIYOMHARUARCA6JYB6CYH6ZJQ4Q25PDBLQZKK7L",
          amount: 1,
        },
        networkDetails: TESTNET_NETWORK_DETAILS,
        transactionFee: "0.00001",
      });

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("/simulate-token-transfer"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            address: "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM",
            pub_key: "GBRPYHIL2C2FCU5RNBJQ3WXZH4E2LQ7H5GIPQKNORRACV4W6F6C4P4W5",
            memo: "memo",
            fee: "100",
            params: {
              publicKey:
                "GBRPYHIL2C2FCU5RNBJQ3WXZH4E2LQ7H5GIPQKNORRACV4W6F6C4P4W5",
              destination:
                "GDQP2KPQGKIHYJGXNUIYOMHARUARCA6JYB6CYH6ZJQ4Q25PDBLQZKK7L",
              amount: 1,
            },
            network_passphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
          }),
        }),
      );
    });
  });

  describe("getTokenPrices request payload filtering", () => {
    // The v2 path routes through the FETCH_BACKEND_V2 background chokepoint
    // (#2879), so it goes through sendMessageToBackground, not a direct fetch.
    const mockSendOk = () =>
      mockedSend.mockResolvedValue({ status: 200, body: { data: {} } });

    const sentMessage = () => mockedSend.mock.calls[0][0];

    it("includes contract tokens (SYMBOL:CONTRACTID) in the v2 request", async () => {
      // The Go backend prices SEP-41 tokens. Without this, a priced contract token would show a
      // live chart under a `--` header price (§4.1).
      mockSendOk();

      await internalApi.getTokenPrices(
        [
          "native",
          "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
          "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        ],
        MAINNET_NETWORK_DETAILS,
      );

      const body = JSON.parse(sentMessage().body as string);
      expect(body.tokens).toEqual([
        "native",
        "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
      ]);
    });

    it("excludes liquidity-pool IDs from the v2 request", async () => {
      // LP shares are never priceable.
      mockSendOk();

      await internalApi.getTokenPrices(
        ["native", "abc123:lp"],
        MAINNET_NETWORK_DETAILS,
      );

      const body = JSON.parse(sentMessage().body as string);
      expect(body.tokens).toEqual(["native"]);
    });

    it("targets the v2 chokepoint with the network query param", async () => {
      mockSendOk();

      await internalApi.getTokenPrices(["native"], TESTNET_NETWORK_DETAILS);

      const message = sentMessage();
      expect(message.type).toBe(SERVICE_TYPES.FETCH_BACKEND_V2);
      expect(message.method).toBe("POST");
      expect(message.path).toContain("/token-prices");
      expect(message.path).toContain("network=TESTNET");
    });

    it("derives the price network from the passphrase for custom networks", async () => {
      mockSendOk();

      // Custom network stored as STANDALONE but sharing the pubnet passphrase
      // must still resolve to PUBLIC and hit the endpoint.
      await internalApi.getTokenPrices(["native"], {
        ...MAINNET_NETWORK_DETAILS,
        network: "STANDALONE",
        networkName: "Custom Pubnet",
        networkPassphrase: Networks.PUBLIC,
      });

      expect(mockedSend).toHaveBeenCalled();
      expect(sentMessage().path).toContain("network=PUBLIC");
    });

    it("skips the request on unsupported networks", async () => {
      mockSendOk();

      const prices = await internalApi.getTokenPrices(
        ["native"],
        FUTURENET_NETWORK_DETAILS,
      );

      expect(mockedSend).not.toHaveBeenCalled();
      expect(prices).toEqual({});
    });

    it("skips the request when every token is filtered out", async () => {
      // Only LP shares are filtered, so an all-LP input is the empty case.
      mockSendOk();

      const prices = await internalApi.getTokenPrices(
        ["abc123:lp", "def456:lp"],
        MAINNET_NETWORK_DETAILS,
      );

      expect(mockedSend).not.toHaveBeenCalled();
      expect(prices).toEqual({});
    });
  });

  describe("getTokenPrices v2 response handling", () => {
    it("returns the price data from a 200 response", async () => {
      const prices = { native: { usd: "1", usdDelta24hPct: "0" } };
      mockedSend.mockResolvedValue({ status: 200, body: { data: prices } });

      const result = await internalApi.getTokenPrices(
        ["native"],
        TESTNET_NETWORK_DETAILS,
      );

      expect(result).toEqual(prices);
    });

    it("throws on a non-200 response", async () => {
      mockedSend.mockResolvedValue({ status: 500, body: null });

      await expect(
        internalApi.getTokenPrices(["native"], TESTNET_NETWORK_DETAILS),
      ).rejects.toThrow();
    });

    it("throws when a 200 response is missing its data payload", async () => {
      // A 200 without `data` must throw, not resolve to undefined — otherwise
      // undefined flows into the price cache/UI.
      mockedSend.mockResolvedValue({ status: 200, body: {} });

      await expect(
        internalApi.getTokenPrices(["native"], TESTNET_NETWORK_DETAILS),
      ).rejects.toThrow();
    });
  });

  describe("getTokenPriceHistory", () => {
    // Frozen §6.1 wire contract — the backend may not exist yet, so these
    // fixtures ARE the contract. Numbers are strings; no data is 200 with
    // points: [] and change: null, never a 404.
    const historyPayload = makeHistory({
      points: [{ t: 1786636800, p: "0.158900" }],
    });

    it("requests the endpoint with token, network, and range in the path query", async () => {
      mockedSend.mockResolvedValue({
        status: 200,
        body: { data: historyPayload },
      });

      await internalApi.getTokenPriceHistory({
        token: "native",
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });

      // Query string must live inside `path`: the background chokepoint signs
      // the JWT over pathname + search (#2879).
      expect(mockedSend).toHaveBeenCalledWith({
        type: SERVICE_TYPES.FETCH_BACKEND_V2,
        activePublicKey: null,
        method: "GET",
        path: "/token-price-history?token=native&network=PUBLIC&range=1D",
      });
    });

    it("URL-encodes contract-token identifiers (SYMBOL:CONTRACTID)", async () => {
      mockedSend.mockResolvedValue({
        status: 200,
        body: {
          data: { ...historyPayload, token: "DT:CCXVDIGMR6WT", range: "1W" },
        },
      });

      await internalApi.getTokenPriceHistory({
        token: "DT:CCXVDIGMR6WT",
        range: "1W",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });

      expect(mockedSend.mock.calls[0][0].path).toBe(
        "/token-price-history?token=DT%3ACCXVDIGMR6WT&network=PUBLIC&range=1W",
      );
    });

    it("returns the payload from a 200 response", async () => {
      mockedSend.mockResolvedValue({
        status: 200,
        body: { data: historyPayload },
      });

      const result = await internalApi.getTokenPriceHistory({
        token: "native",
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });

      expect(result).toEqual(historyPayload);
    });

    it("resolves (not throws) an empty series — no data is a valid outcome", async () => {
      const emptyPayload = {
        ...historyPayload,
        range: "1H",
        points: [],
        change: null,
        lowVolume: null,
      };
      mockedSend.mockResolvedValue({
        status: 200,
        body: { data: emptyPayload },
      });

      const result = await internalApi.getTokenPriceHistory({
        token: "native",
        range: "1H",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });

      expect(result).toEqual(emptyPayload);
    });

    it("throws on a non-200 response", async () => {
      mockedSend.mockResolvedValue({
        status: 503,
        body: { error: "upstream down" },
      });

      await expect(
        internalApi.getTokenPriceHistory({
          token: "native",
          range: "1D",
          networkDetails: MAINNET_NETWORK_DETAILS,
        }),
      ).rejects.toThrow();
    });

    it("throws on a 200 with no data payload", async () => {
      mockedSend.mockResolvedValue({ status: 200, body: {} });

      await expect(
        internalApi.getTokenPriceHistory({
          token: "native",
          range: "1D",
          networkDetails: MAINNET_NETWORK_DETAILS,
        }),
      ).rejects.toThrow();
    });

    // A malformed series reaches `Intl.DateTimeFormat` when the accessible
    // label is built and throws during render, where the app-level
    // ErrorBoundary replaces the whole popup. Reject it at the boundary.
    it.each([
      ["a non-finite timestamp", { points: [{ t: NaN, p: "1.0" }] }],
      ["a non-positive resolutionSeconds", { resolutionSeconds: 0 }],
      // Every label downstream prints these with a "$".
      ["another currency", { currency: "EUR" }],
      ["a missing currency", { currency: undefined }],
      // `null` means "verdict unavailable" and warns; missing would read as
      // false and silence the notice.
      ["a missing lowVolume", { lowVolume: undefined }],
      // A stringly verdict would read as falsy and silence the banner.
      ["a stringly lowVolume", { lowVolume: "false" }],
      // Nullable, not optional: present on every payload, `null` only when
      // the coverage guard rejected the window. A missing field produces an
      // empty header indistinguishable from the legitimate null.
      ["a missing change", { change: undefined }],
      // The header prints one sign, from the percent, in front of both
      // halves — so this would render a $1 loss as "+$1.00 (2.00%)".
      [
        "a change whose halves disagree on sign",
        { change: { absolute: "-1", percent: "2" } },
      ],
    ])("throws on %s", async (_label, overrides) => {
      mockedSend.mockResolvedValue({
        status: 200,
        body: { data: { ...historyPayload, ...overrides } },
      });

      await expect(
        internalApi.getTokenPriceHistory({
          token: "native",
          range: "1D",
          networkDetails: MAINNET_NETWORK_DETAILS,
        }),
      ).rejects.toThrow();
    });

    it("accepts a zero half against a non-zero one — that is ordinary rounding", async () => {
      const rounded = {
        ...historyPayload,
        change: { absolute: "0", percent: "-0.01" },
      };
      mockedSend.mockResolvedValue({ status: 200, body: { data: rounded } });

      await expect(
        internalApi.getTokenPriceHistory({
          token: "native",
          range: "1D",
          networkDetails: MAINNET_NETWORK_DETAILS,
        }),
      ).resolves.toEqual(rounded);
    });

    it("throws on unsupported networks instead of sending a request", async () => {
      await expect(
        internalApi.getTokenPriceHistory({
          token: "native",
          range: "1D",
          networkDetails: FUTURENET_NETWORK_DETAILS,
        }),
      ).rejects.toThrow();
      expect(mockedSend).not.toHaveBeenCalled();
    });
  });

  describe("getTokenStats", () => {
    it("requests the endpoint with token and network in the path query", async () => {
      mockedSend.mockResolvedValue({
        status: 200,
        body: {
          data: {
            token: "native",
            supplyOnStellar: "105443902087.3472865",
            holders: 9926520,
          },
        },
      });

      const result = await internalApi.getTokenStats({
        token: "native",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });

      expect(mockedSend).toHaveBeenCalledWith({
        type: SERVICE_TYPES.FETCH_BACKEND_V2,
        activePublicKey: null,
        method: "GET",
        path: "/token-stats?token=native&network=PUBLIC",
      });
      expect(result).toEqual({
        token: "native",
        supplyOnStellar: "105443902087.3472865",
        holders: 9926520,
      });
    });

    it("passes through per-asset field omissions — absent fields stay absent", async () => {
      mockedSend.mockResolvedValue({
        status: 200,
        body: { data: { token: "DT:CCXVDIGMR6WT" } },
      });

      const result = await internalApi.getTokenStats({
        token: "DT:CCXVDIGMR6WT",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });

      expect(result).toEqual({ token: "DT:CCXVDIGMR6WT" });
      expect("supplyOnStellar" in result).toBe(false);
      expect("holders" in result).toBe(false);
    });

    // `formatStatValue` rounds down, so 1.9 would render a plausible "1".
    it("throws on a fractional holders count", async () => {
      mockedSend.mockResolvedValue({
        status: 200,
        body: {
          data: { token: "native", supplyOnStellar: "12", holders: 1.9 },
        },
      });

      await expect(
        internalApi.getTokenStats({
          token: "native",
          networkDetails: MAINNET_NETWORK_DETAILS,
        }),
      ).rejects.toThrow();
    });

    it("throws on a non-200 response", async () => {
      mockedSend.mockResolvedValue({ status: 500, body: null });

      await expect(
        internalApi.getTokenStats({
          token: "native",
          networkDetails: MAINNET_NETWORK_DETAILS,
        }),
      ).rejects.toThrow();
    });

    it("throws on unsupported networks instead of sending a request", async () => {
      await expect(
        internalApi.getTokenStats({
          token: "native",
          networkDetails: FUTURENET_NETWORK_DETAILS,
        }),
      ).rejects.toThrow();
      expect(mockedSend).not.toHaveBeenCalled();
    });
  });

  describe("getStellarExpertAssets", () => {
    const page = { _embedded: { records: [{ asset: "USDC-GUSD" }] } };

    it("lists assets through the FETCH_BACKEND_V2 message", async () => {
      mockedSend.mockResolvedValue({ status: 200, body: { data: page } });

      const result = await internalApi.getStellarExpertAssets({
        networkDetails: MAINNET_NETWORK_DETAILS,
        query: { sort: "volume7d", order: "desc", limit: "50" },
      });

      expect(mockedSend).toHaveBeenCalledWith({
        type: SERVICE_TYPES.FETCH_BACKEND_V2,
        activePublicKey: null,
        method: "GET",
        path: "/assets/search?network=PUBLIC&sort=volume7d&order=desc&limit=50",
      });
      expect(result).toEqual(page);
    });

    it("asks for Testnet assets on Testnet", async () => {
      mockedSend.mockResolvedValue({ status: 200, body: { data: page } });

      await internalApi.getStellarExpertAssets({
        networkDetails: TESTNET_NETWORK_DETAILS,
        query: { limit: "50" },
      });

      expect(mockedSend.mock.calls[0][0].path).toBe(
        "/assets/search?network=TESTNET&limit=50",
      );
    });

    // A raw "&" would start another parameter, which the backend refuses.
    it("encodes the search term", async () => {
      mockedSend.mockResolvedValue({ status: 200, body: { data: page } });

      await internalApi.getStellarExpertAssets({
        networkDetails: MAINNET_NETWORK_DETAILS,
        query: { search: "a&b c" },
      });

      expect(mockedSend.mock.calls[0][0].path).toBe(
        "/assets/search?network=PUBLIC&search=a%26b+c",
      );
    });

    it("returns no assets on networks StellarExpert doesn't serve, without a request", async () => {
      const result = await internalApi.getStellarExpertAssets({
        networkDetails: FUTURENET_NETWORK_DETAILS,
        query: { search: "usdc" },
      });

      expect(result).toEqual({ _embedded: { records: [] } });
      expect(mockedSend).not.toHaveBeenCalled();
    });

    it("throws on a non-200 response", async () => {
      mockedSend.mockResolvedValue({
        status: 503,
        body: { error: "asset search temporarily unavailable" },
      });

      await expect(
        internalApi.getStellarExpertAssets({
          networkDetails: MAINNET_NETWORK_DETAILS,
          query: { search: "usdc" },
        }),
      ).rejects.toThrow("503");
    });

    it("throws on a 200 whose body has no records", async () => {
      mockedSend.mockResolvedValue({ status: 200, body: { data: {} } });

      await expect(
        internalApi.getStellarExpertAssets({
          networkDetails: MAINNET_NETWORK_DETAILS,
          query: { search: "usdc" },
        }),
      ).rejects.toThrow();
    });

    it("sends nothing once the signal has aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        internalApi.getStellarExpertAssets({
          networkDetails: MAINNET_NETWORK_DETAILS,
          query: { search: "usdc" },
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });
      expect(mockedSend).not.toHaveBeenCalled();
    });

    // The background request can't be cancelled, so its late answer is
    // refused instead.
    it("rejects an answer that arrives after the abort", async () => {
      const controller = new AbortController();
      mockedSend.mockImplementation(async () => {
        controller.abort();
        return { status: 200, body: { data: page } };
      });

      await expect(
        internalApi.getStellarExpertAssets({
          networkDetails: MAINNET_NETWORK_DETAILS,
          query: { search: "usdc" },
          signal: controller.signal,
        }),
      ).rejects.toMatchObject({ name: "AbortError" });
    });
  });

  describe("getDiscoverData", () => {
    it("fetches /protocols via the FETCH_BACKEND_V2 message", async () => {
      mockedSend.mockResolvedValue({
        status: 200,
        body: {
          data: {
            protocols: [
              {
                description: "d",
                icon_url: "i",
                name: "n",
                website_url: "w",
                tags: ["t"],
                is_blacklisted: false,
                is_trending: true,
              },
            ],
          },
        },
      });

      const result = await internalApi.getDiscoverData();

      expect(mockedSend).toHaveBeenCalledWith({
        type: SERVICE_TYPES.FETCH_BACKEND_V2,
        activePublicKey: null,
        method: "GET",
        path: "/protocols",
      });
      expect(result[0]).toMatchObject({
        name: "n",
        iconUrl: "i",
        isTrending: true,
      });
    });
  });

  describe("getTokenDetails", () => {
    afterEach(() => jest.restoreAllMocks());

    it("treats a plain-text 400 as not a token, even when asked to throw", async () => {
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.reject(new SyntaxError("Unexpected token S")),
      } as unknown as Response);

      await expect(
        internalApi.getTokenDetails({
          contractId:
            "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV",
          publicKey: "G123",
          networkDetails: MAINNET_NETWORK_DETAILS,
          throwOnFailure: true,
        }),
      ).resolves.toBeNull();
    });
  });
});
