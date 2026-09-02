import { Networks } from "stellar-sdk";
import {
  FUTURENET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import * as GetLedgerKeyAccounts from "../helpers/getLedgerKeyAccounts";
import * as GetIconUrlFromIssuer from "../helpers/getIconUrlFromIssuer";
import * as IconProbe from "../helpers/iconProbe";
import * as internalApi from "../internal";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { SERVICE_TYPES } from "@shared/constants/services";

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

describe("internalApi", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
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

    it("excludes contract-ID issuers from the indexer request", async () => {
      mockSendOk();

      await internalApi.getTokenPrices(
        [
          "native",
          "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
          "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        ],
        MAINNET_NETWORK_DETAILS,
        true,
      );

      const body = JSON.parse(sentMessage().body as string);
      expect(body.tokens).toEqual([
        "native",
        "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      ]);
    });

    it("excludes liquidity-pool IDs from the indexer request", async () => {
      mockSendOk();

      await internalApi.getTokenPrices(
        ["native", "abc123:lp"],
        MAINNET_NETWORK_DETAILS,
        true,
      );

      const body = JSON.parse(sentMessage().body as string);
      expect(body.tokens).toEqual(["native"]);
    });

    it("targets the v2 chokepoint with the network query param", async () => {
      mockSendOk();

      await internalApi.getTokenPrices(
        ["native"],
        TESTNET_NETWORK_DETAILS,
        true,
      );

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
      await internalApi.getTokenPrices(
        ["native"],
        {
          ...MAINNET_NETWORK_DETAILS,
          network: "STANDALONE",
          networkName: "Custom Pubnet",
          networkPassphrase: Networks.PUBLIC,
        },
        true,
      );

      expect(mockedSend).toHaveBeenCalled();
      expect(sentMessage().path).toContain("network=PUBLIC");
    });

    it("skips the request on unsupported networks", async () => {
      mockSendOk();

      const prices = await internalApi.getTokenPrices(
        ["native"],
        FUTURENET_NETWORK_DETAILS,
        true,
      );

      expect(mockedSend).not.toHaveBeenCalled();
      expect(prices).toEqual({});
    });

    it("skips the request when every token is filtered out", async () => {
      mockSendOk();

      const prices = await internalApi.getTokenPrices(
        [
          "abc123:lp",
          "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        ],
        MAINNET_NETWORK_DETAILS,
        true,
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
        true,
      );

      expect(result).toEqual(prices);
    });

    it("throws on a non-200 response", async () => {
      mockedSend.mockResolvedValue({ status: 500, body: null });

      await expect(
        internalApi.getTokenPrices(["native"], TESTNET_NETWORK_DETAILS, true),
      ).rejects.toThrow();
    });

    it("throws when a 200 response is missing its data payload", async () => {
      // A 200 without `data` must throw, not resolve to undefined — otherwise
      // undefined flows into the price cache/UI.
      mockedSend.mockResolvedValue({ status: 200, body: {} });

      await expect(
        internalApi.getTokenPrices(["native"], TESTNET_NETWORK_DETAILS, true),
      ).rejects.toThrow();
    });
  });

  describe("getTokenPrices v1 endpoint (useV2 = false)", () => {
    const mockFetchOk = () =>
      jest.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: {} }),
      } as unknown as Response);

    it("targets the v1 endpoint without a network query param", async () => {
      const fetchSpy = mockFetchOk();

      await internalApi.getTokenPrices(
        ["native"],
        TESTNET_NETWORK_DETAILS,
        false,
      );

      const requestUrl = fetchSpy.mock.calls[0][0] as string;
      expect(requestUrl).toContain("/token-prices");
      expect(requestUrl).not.toContain("network=");
    });

    it("still filters LP IDs and contract-ID issuers from the request", async () => {
      const fetchSpy = mockFetchOk();

      await internalApi.getTokenPrices(
        [
          "native",
          "abc123:lp",
          "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        ],
        MAINNET_NETWORK_DETAILS,
        false,
      );

      const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(requestInit.body as string);
      expect(body.tokens).toEqual(["native"]);
    });

    it("does NOT skip unsupported networks (unlike v2)", async () => {
      const fetchSpy = mockFetchOk();

      await internalApi.getTokenPrices(
        ["native"],
        FUTURENET_NETWORK_DETAILS,
        false,
      );

      expect(fetchSpy).toHaveBeenCalled();
    });

    it("does NOT skip when every token is filtered out (unlike v2)", async () => {
      const fetchSpy = mockFetchOk();

      await internalApi.getTokenPrices(
        [
          "abc123:lp",
          "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        ],
        MAINNET_NETWORK_DETAILS,
        false,
      );

      expect(fetchSpy).toHaveBeenCalled();
      const requestInit = fetchSpy.mock.calls[0][1] as RequestInit;
      const body = JSON.parse(requestInit.body as string);
      expect(body.tokens).toEqual([]);
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
  describe("retryAssetIcon", () => {
    const KEY = "GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q";
    const CODE = "USDT0";
    const CANONICAL = `${CODE}:${KEY}`;
    const FAILED_ICON = "https://ipfs.io/ipfs/bafkreidead";
    const OTHER_DEAD_ICON = "https://also-dead.example/icon.png";
    const LIVE_ICON = "https://docs.usdt0.to/downloads/usdt0/icon.png";
    const TOML_ICON = "https://usdt0.to/icon.png";

    const listWith = (icon: string, provider: string) =>
      ({
        name: "Test list",
        description: "",
        network: "public",
        version: "1.0",
        provider,
        assets: [
          {
            code: CODE,
            issuer: KEY,
            name: CODE,
            org: CODE,
            domain: "usdt0.to",
            icon,
            decimals: 7,
          },
        ],
      }) as any;

    /** Stands in for the browser: only the named urls render. */
    const onlyLoads = (...loadable: string[]) =>
      jest
        .spyOn(IconProbe, "firstLoadableIconUrl")
        .mockImplementation(async (urls: string[]) =>
          urls.find((url) => loadable.includes(url)),
        );

    const retry = (
      assetsListsData: unknown[],
      failedIcon: string = FAILED_ICON,
    ) =>
      internalApi.retryAssetIcon({
        activePublicKey: null,
        key: KEY,
        code: CODE,
        assetIcons: { [CANONICAL]: failedIcon },
        networkDetails: MAINNET_NETWORK_DETAILS,
        assetsListsData: assetsListsData as any,
      });

    it("settles on a candidate that loads", async () => {
      onlyLoads(LIVE_ICON);

      const result = await retry([
        listWith(OTHER_DEAD_ICON, "A"),
        listWith(LIVE_ICON, "B"),
      ]);

      expect(result[CANONICAL]).toEqual(LIVE_ICON);
    });

    it("never re-offers the url that just failed, even if it would load", async () => {
      // The url rendered once and is cached; it is failing now. Handing it
      // back would just re-render the same broken image.
      onlyLoads(FAILED_ICON, LIVE_ICON);

      const result = await retry([
        listWith(FAILED_ICON, "A"),
        listWith(LIVE_ICON, "B"),
      ]);

      expect(result[CANONICAL]).toEqual(LIVE_ICON);
    });

    it("falls back to the issuer TOML when the lists offer nothing else", async () => {
      onlyLoads(TOML_ICON);
      jest
        .spyOn(GetIconUrlFromIssuer, "getIconUrlFromIssuer")
        .mockResolvedValue(TOML_ICON);

      const result = await retry([listWith(FAILED_ICON, "A")]);

      expect(result[CANONICAL]).toEqual(TOML_ICON);
    });

    it("clears the TOML url it rejected, so the next load does not trust it", async () => {
      // getIconUrlFromIssuer caches whatever the toml claims before we get to
      // load it. Leaving a rejected url there would have getAssetIcons serve it
      // straight from cache next time, recreating the loop this all fixes.
      onlyLoads();
      jest
        .spyOn(GetIconUrlFromIssuer, "getIconUrlFromIssuer")
        .mockResolvedValue(TOML_ICON);
      mockedSend.mockClear();

      await retry([listWith(FAILED_ICON, "A")]);

      const clears = mockedSend.mock.calls.filter(
        ([message]) =>
          message?.type === SERVICE_TYPES.CACHE_ASSET_ICON &&
          message?.assetCanonical === CANONICAL &&
          !message?.iconUrl,
      );
      // One before the lookup, one to undo what getIconUrlFromIssuer cached.
      expect(clears).toHaveLength(2);
    });

    it("matches contract assets against the lists by contract id, not issuer", async () => {
      // AccountAssets passes a soroban balance's contractId as `key`, and the
      // lists key those entries by `contract` — so looking them up as an issuer
      // never matches and getIconUrlFromIssuer bails on its ed25519 guard.
      const CONTRACT =
        "CBSJZEIO5C7KC2SF3MKSNXXJSW5G3VTNBX4ATMKUI3B2MR4JKM4R26YF";
      onlyLoads(LIVE_ICON);

      const result = await internalApi.retryAssetIcon({
        activePublicKey: null,
        key: CONTRACT,
        code: CODE,
        assetIcons: { [`${CODE}:${CONTRACT}`]: FAILED_ICON },
        networkDetails: MAINNET_NETWORK_DETAILS,
        assetsListsData: [
          {
            name: "Test list",
            description: "",
            network: "public",
            version: "1.0",
            provider: "A",
            assets: [
              {
                code: CODE,
                contract: CONTRACT,
                name: CODE,
                org: CODE,
                domain: "usdt0.to",
                icon: LIVE_ICON,
                decimals: 7,
              },
            ],
          },
        ] as any,
      });

      expect(result[`${CODE}:${CONTRACT}`]).toEqual(LIVE_ICON);
    });

    it("clears the icon when no source offers anything that loads", async () => {
      onlyLoads();
      jest
        .spyOn(GetIconUrlFromIssuer, "getIconUrlFromIssuer")
        .mockResolvedValue(TOML_ICON);

      const result = await retry([listWith(FAILED_ICON, "A")]);

      expect(result[CANONICAL]).toEqual("");
    });
  });

  describe("getAssetIcons", () => {
    const KEY = "GATISXX6BZ6NC7IKQBY37CJD4SOZL3CYZJWXEDG6JVIY4WBS6KXJHN6Q";
    const CODE = "USDT0";
    const CANONICAL = `${CODE}:${KEY}`;
    const DEAD_ICON = "https://ipfs.io/ipfs/bafkreidead";
    const LIVE_ICON = "https://docs.usdt0.to/downloads/usdt0/icon.png";
    const TOML_ICON = "https://usdt0.to/icon.png";

    const balances = {
      [CANONICAL]: {
        token: { code: CODE, issuer: { key: KEY } },
      },
    } as any;

    const listWith = (icon: string, provider: string) =>
      ({
        name: "Test list",
        description: "",
        network: "public",
        version: "1.0",
        provider,
        assets: [
          {
            code: CODE,
            issuer: KEY,
            name: CODE,
            org: CODE,
            domain: "usdt0.to",
            icon,
            decimals: 7,
          },
        ],
      }) as any;

    /** Stands in for the browser: only `loadable` renders. */
    const onlyLoads = (loadable: string) =>
      jest
        .spyOn(IconProbe, "firstLoadableIconUrl")
        .mockImplementation(async (urls: string[]) =>
          urls.find((url) => url === loadable),
        );

    it("uses the candidate that loads rather than the one listed first", async () => {
      onlyLoads(LIVE_ICON);

      const icons = await internalApi.getAssetIcons({
        balances,
        networkDetails: MAINNET_NETWORK_DETAILS,
        assetsListsData: [listWith(DEAD_ICON, "A"), listWith(LIVE_ICON, "B")],
        cachedIcons: {},
      });

      expect(icons[CANONICAL]).toEqual(LIVE_ICON);
    });

    it("caches the icon it settled on, not the one it rejected", async () => {
      onlyLoads(LIVE_ICON);

      await internalApi.getAssetIcons({
        balances,
        networkDetails: MAINNET_NETWORK_DETAILS,
        assetsListsData: [listWith(DEAD_ICON, "A"), listWith(LIVE_ICON, "B")],
        cachedIcons: {},
      });

      expect(mockedSend).toHaveBeenCalledWith({
        activePublicKey: null,
        assetCanonical: CANONICAL,
        iconUrl: LIVE_ICON,
        type: SERVICE_TYPES.CACHE_ASSET_ICON,
      });
    });

    it("falls back to the issuer TOML when no list candidate loads", async () => {
      onlyLoads(TOML_ICON);
      jest
        .spyOn(GetLedgerKeyAccounts, "getLedgerKeyAccounts")
        .mockResolvedValue({
          [KEY]: { home_domain: "usdt0.to" },
        } as any);
      jest
        .spyOn(GetIconUrlFromIssuer, "getIconUrlFromIssuer")
        .mockResolvedValue(TOML_ICON);

      const icons = await internalApi.getAssetIcons({
        balances,
        networkDetails: MAINNET_NETWORK_DETAILS,
        assetsListsData: [listWith(DEAD_ICON, "A")],
        cachedIcons: {},
      });

      expect(icons[CANONICAL]).toEqual(TOML_ICON);
    });

    it("discards an issuer TOML icon that does not load", async () => {
      // Nothing renders, including the toml's own url.
      onlyLoads("https://nothing-loads.example/icon.png");
      jest
        .spyOn(GetLedgerKeyAccounts, "getLedgerKeyAccounts")
        .mockResolvedValue({
          [KEY]: { home_domain: "usdt0.to" },
        } as any);
      jest
        .spyOn(GetIconUrlFromIssuer, "getIconUrlFromIssuer")
        .mockResolvedValue(TOML_ICON);

      const icons = await internalApi.getAssetIcons({
        balances,
        networkDetails: MAINNET_NETWORK_DETAILS,
        assetsListsData: [listWith(DEAD_ICON, "A")],
        cachedIcons: {},
      });

      expect(icons[CANONICAL]).toBeNull();
    });

    it("resolves icons for many assets concurrently, not one after another", async () => {
      // getAssetIcons is awaited before the balances render, so serial probes
      // would add an image round-trip per asset to a previously instant scan.
      let inFlight = 0;
      let peak = 0;
      jest
        .spyOn(IconProbe, "firstLoadableIconUrl")
        .mockImplementation(async (urls: string[]) => {
          inFlight += 1;
          peak = Math.max(peak, inFlight);
          await new Promise((resolve) => setTimeout(resolve, 5));
          inFlight -= 1;
          return urls[0];
        });

      const manyBalances: any = {};
      const manyLists: any[] = [];
      for (let i = 0; i < 6; i++) {
        const issuer = `GISSUER${i}`;
        manyBalances[`AST${i}:${issuer}`] = {
          token: { code: `AST${i}`, issuer: { key: issuer } },
        };
        manyLists.push({
          name: "Test list",
          description: "",
          network: "public",
          version: "1.0",
          provider: `P${i}`,
          assets: [
            {
              code: `AST${i}`,
              issuer,
              name: `AST${i}`,
              org: `AST${i}`,
              domain: "example.com",
              icon: `https://example.com/${i}.png`,
              decimals: 7,
            },
          ],
        });
      }

      await internalApi.getAssetIcons({
        balances: manyBalances,
        networkDetails: MAINNET_NETWORK_DETAILS,
        assetsListsData: manyLists,
        cachedIcons: {},
      });

      expect(peak).toBeGreaterThan(1);
    });

    it("trusts an already-cached icon without re-probing it", async () => {
      const probe = jest.spyOn(IconProbe, "firstLoadableIconUrl");

      const icons = await internalApi.getAssetIcons({
        balances,
        networkDetails: MAINNET_NETWORK_DETAILS,
        assetsListsData: [listWith(LIVE_ICON, "A")],
        cachedIcons: { [CANONICAL]: LIVE_ICON },
      });

      expect(icons[CANONICAL]).toEqual(LIVE_ICON);
      expect(probe).not.toHaveBeenCalled();
    });
  });
});
