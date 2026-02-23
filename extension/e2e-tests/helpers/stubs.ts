import { BrowserContext, Page } from "@playwright/test";
import { USDC_TOKEN_ADDRESS, TEST_TOKEN_ADDRESS } from "./test-token";

export const createAssetObject = (assetCode: string | null, issuer: string) => {
  if (!assetCode || assetCode === "XLM") {
    return {
      asset_type: "native",
      asset_code: null,
      asset_issuer: null,
    };
  }

  return {
    asset_type: assetCode.length > 4 ? "credit_alphanum12" : "credit_alphanum4",
    asset_code: assetCode,
    asset_issuer: issuer,
  };
};

export const STELLAR_EXPERT_ASSET_LIST_JSON = {
  name: "StellarExpert Top 50",
  provider: "StellarExpert",
  description:
    "Dynamically generated list based on technical asset metrics, including payments and trading volumes, interoperability, userbase, etc. Assets included in this list were not verified by StellarExpert team. StellarExpert is not affiliated with issuers, and does not endorse or advertise assets in the list. Assets reported for fraudulent activity removed from the list automatically.",
  version: "1.0",
  network: "testnet",
  feedback: "https://stellar.expert",
  assets: [
    {
      code: "USDC",
      issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      contract: USDC_TOKEN_ADDRESS,
      name: "USDC",
      org: "unknown",
      domain: "centre.io",
      decimals: 7,
    },
  ],
};

export const stubUserNotification = async (context: BrowserContext) => {
  await context.route("*/**/user-notification", async (route) => {
    await route.fulfill({
      json: { enabled: false, message: "" },
    });
  });
};

export const stubFeatureFlags = async (context: BrowserContext) => {
  await context.route("*/**/feature-flags", async (route) => {
    await route.fulfill({
      json: { useSorobanPublic: true },
    });
  });
};

export const stubSubscriptionAccount = async (context: BrowserContext) => {
  await context.route("*/**/subscription/account", async (route) => {
    await route.fulfill({
      json: { data: {}, error: null },
    });
  });
};

export const stubStellarAssetList = async (page: Page) => {
  await page.route("*/**/testnet/asset-list/**", async (route) => {
    await route.fulfill({ json: STELLAR_EXPERT_ASSET_LIST_JSON });
  });
};

export const stubAssetSearch = async (page: Page) => {
  await page.route("**/asset?search**", async (route) => {
    const json = {
      _embedded: {
        records: [
          {
            asset:
              "USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
            num_accounts: 1000,
            num_trades: 5000,
            num_liquidity_pools: 100,
            bidding_liabilities: "1000000",
            asking_liabilities: "2000000",
          },
        ],
      },
    };
    await route.fulfill({ json });
  });
};

export const stubHorizonAccounts = async (page: Page) => {
  await page.route("**/accounts/**", async (route) => {
    await route.fulfill({
      json: {
        id: "GDMDFPJPFH4Z2LLUCNNQT3HVQ2XU2TMZBA6OL37C752WCKU7JZO2S52R",
        account_id: "GDMDFPJPFH4Z2LLUCNNQT3HVQ2XU2TMZBA6OL37C752WCKU7JZO2S52R",
        sequence: "1234567890",
        subentry_count: 0,
        last_modified_ledger: 12345,
        balances: [
          {
            balance: "10000.0000000",
            asset_type: "native",
          },
        ],
        signers: [
          {
            weight: 1,
            key: "GDMDFPJPFH4Z2LLUCNNQT3HVQ2XU2TMZBA6OL37C752WCKU7JZO2S52R",
            type: "ed25519_public_key",
          },
        ],
        data: {},
        thresholds: {
          low_threshold: 0,
          med_threshold: 0,
          high_threshold: 0,
        },
      },
    });
  });
};

export const stubHorizonTransactions = async (page: Page) => {
  await page.route("**/horizon/**/transactions", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        json: {
          hash: "d7fc8d3f7b9e8c7d6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c",
          ledger: 10000,
          envelope_xdr:
            "AAAAAgAAAABNGU5jYvjfSepLUbRF52FIw18Fm1F76RViTI0pjWF7VAAAAAAAAAQoAAAAAAAAAA==",
          result_xdr: "AAAAAAAAACgAAAAAAAAAA==",
        },
      });
    } else {
      await route.fulfill({
        json: {
          _embedded: { records: [] },
        },
      });
    }
  });
};

export const stubBackendSimulateTx = async (page: Page) => {
  await page.route("**/simulate-tx**", async (route) => {
    await route.fulfill({
      json: {
        preparedTransaction:
          "AAAAAgAAAABNGU5jYvjfSepLUbRF52FIw18Fm1F76RViTI0pjWF7VAAAAZAAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAABAAAAAAAAAAAAAA=",
        simulationResponse: {
          minResourceFee: "100",
          cost: {
            cpuInsns: "1000",
            memBytes: "1000",
          },
          latestLedger: "10000",
        },
      },
    });
  });
};

export const stubBackendSubmitTx = async (page: Page) => {
  await page.route("**/submit-tx**", async (route) => {
    await route.fulfill({
      json: {
        hash: "a7f2d8c9e1b4f3a6d5c8b7e9f1a2d3c4b5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0",
        ledger: 10000,
        envelope_xdr:
          "AAAAAgAAAABNGU5jYvjfSepLUbRF52FIw18Fm1F76RViTI0pjWF7VAAAAZAAAAABAAAAAAAAAAEAAAAAAAAAAAAAAAEAAAAAAAAABAAAAAAAAAAAAAA=",
        result_xdr: "AAAAAAAAAGQAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAA=",
      },
    });
  });
};

export const stubStellarToml = async (page: Page) => {
  await page.route("**/.well-known/stellar.toml", async (route) => {
    await route.fulfill({
      body: `FEDERATION_SERVER="https://federation.lobstr.co"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"`,
      contentType: "text/plain",
    });
  });
};

export const stubFederation = async (page: Page) => {
  await page.route("**/federation**", async (route) => {
    await route.fulfill({
      json: {
        stellar_address: "freighter.pb*lobstr.co",
        account_id: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
      },
    });
  });
};

export const stubDefaultAccountBalances = async (page: Page) => {
  await page.route("**/account-balances/**", async (route) => {
    const json = {
      balances: {
        native: {
          token: {
            type: "native",
            code: "XLM",
          },
          total: "10000.0000000",
          available: "10000.0000000",
          sellingLiabilities: "0",
          buyingLiabilities: "0",
          minimumBalance: "1",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address: "",
            metadata: {
              type: "",
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {},
          },
        },
      },
      isFunded: true,
      subentryCount: 0,
      error: {
        horizon: null,
        soroban: null,
      },
    };
    await route.fulfill({ json });
  });
};

export const stubMercuryTransactions = async (page: Page) => {
  await page.route("**/transactions**", async (route) => {
    await route.fulfill({
      json: {
        _embedded: { records: [] },
      },
    });
  });
};

export const stubSorobanRpc = async (page: Page) => {
  await page.route("**/soroban/rpc/**", async (route) => {
    await route.fulfill({
      json: { jsonrpc: "2.0", id: "1", result: null },
    });
  });
};

export const stubBackendSettingsEndpoint = async (page: Page) => {
  await page.route("**/backend-settings", async (route) => {
    await route.fulfill({
      json: {
        isSorobanPublicEnabled: true,
        isRpcHealthy: true,
        userNotification: { enabled: false, message: "" },
      },
    });
  });
};

export const stubLedgerKeysAccounts = async (page: Page) => {
  await page.route("**/ledger-keys/accounts/**", async (route) => {
    await route.fulfill({
      json: {
        data: {},
        error: null,
      },
    });
  });
};

export const stubFriendbot = async (page: Page | BrowserContext) => {
  await page.route("**/friendbot**", async (route) => {
    const json = {
      hash: "d7fc8d3f7b9e8c7d6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c",
      ledger: 10000,
      envelope_xdr:
        "AAAAAgAAAABNGU5jYvjfSepLUbRF52FIw18Fm1F76RViTI0pjWF7VAAAAAAAAAQoAAAAAAAAAAENQJiZNGU5jYvjfSepLUbRF52FIw18Fm1F76RViTI0pjWF7VAAACgDAAAAFQAAAAEAAAA=",
      result_xdr: "AAAAAAAAACgAAAAAAAAAAQAAAAAD6QAAAAAAAAAA",
    };
    await route.fulfill({ json });
  });
};

export const stubScanDapp = async (context: BrowserContext) => {
  await context.route("**/scan-dapp**", async (route) => {
    const json = {
      data: {
        status: "hit",
        url: "https://docs.freighter.app/docs/playground/setallowed/",
        scan_start_time: "2025-07-04T08:58:59.350000",
        scan_end_time: "2025-07-04T09:02:37.766000",
        malicious_score: 0,
        is_reachable: true,
        is_web3_site: false,
        is_malicious: false,
        attack_types: {},
        network_operations: [
          "framer.com",
          "framerusercontent.com",
          "freighter.app",
          "googletagmanager.com",
          "w3.org",
        ],
        json_rpc_operations: [],
        contract_write: {
          contract_addresses: [],
          functions: {},
        },
        contract_read: {
          contract_addresses: [],
          functions: {},
        },
        modals: [],
      },
      error: null,
    };
    await route.fulfill({ json });
  });
};

/**
 * Stubs scan-asset endpoint to return "unable to scan" response (null data)
 * This simulates when BlockAid cannot scan an asset
 */
export const stubScanAssetUnableToScan = async (
  page: Page | BrowserContext,
) => {
  await page.route("**/scan-asset**", async (route) => {
    const json = {
      data: null,
      error: null,
    };
    await route.fulfill({ json });
  });
};

/**
 * Stubs scan-tx endpoint to return "unable to scan" response (null data)
 * This simulates when BlockAid cannot scan a transaction
 */
export const stubScanTxUnableToScan = async (page: Page | BrowserContext) => {
  await page.route("**/scan-tx**", async (route) => {
    const json = {
      data: null,
      error: null,
    };
    await route.fulfill({ json });
  });
};

/**
 * Stubs scan-asset endpoint to return "malicious" response
 * This simulates when BlockAid detects a malicious asset
 */
export const stubScanAssetMalicious = async (page: Page | BrowserContext) => {
  await page.route("**/scan-asset**", async (route) => {
    const json = {
      data: {
        result_type: "Malicious",
        malicious_score: "0.9",
        attack_types: {
          transfer_farming: true,
          theft: true,
        },
        chain: "stellar",
        address: "",
        metadata: {
          type: "",
        },
        fees: {},
        features: [
          {
            description:
              "A malicious transaction causes a transfer, draining the user's assets and tokens.",
          },
          {
            description:
              "This asset has been reported for fraudulent activity.",
          },
        ],
        trading_limits: {},
        financial_stats: {},
      },
      error: null,
    };
    await route.fulfill({ json });
  });
};

/**
 * Stubs scan-asset endpoint to return "suspicious" response
 * This simulates when BlockAid detects a suspicious asset
 */
export const stubScanAssetSuspicious = async (page: Page | BrowserContext) => {
  await page.route("**/scan-asset**", async (route) => {
    const json = {
      data: {
        result_type: "Warning",
        malicious_score: "0.5",
        attack_types: {},
        chain: "stellar",
        address: "",
        metadata: {
          type: "",
        },
        fees: {},
        features: [
          {
            description:
              "This asset has unusual trading patterns that may indicate risk.",
          },
          {
            description:
              "The issuer has a low trust score based on historical data.",
          },
        ],
        trading_limits: {},
        financial_stats: {},
      },
      error: null,
    };
    await route.fulfill({ json });
  });
};

/**
 * Stubs scan-asset endpoint to return "safe" (benign) response
 * This simulates when BlockAid confirms an asset is safe
 */
export const stubScanAssetSafe = async (page: Page | BrowserContext) => {
  await page.route("**/scan-asset**", async (route) => {
    const json = {
      data: {
        result_type: "Benign",
        malicious_score: "0.0",
        attack_types: {},
        chain: "stellar",
        address: "",
        metadata: {
          type: "",
        },
        fees: {},
        features: [],
        trading_limits: {},
        financial_stats: {},
      },
      error: null,
    };
    await route.fulfill({ json });
  });
};

/**
 * Stubs scan-tx endpoint to return "malicious" response
 * This simulates when BlockAid detects a malicious transaction
 */
export const stubScanTxMalicious = async (page: Page | BrowserContext) => {
  await page.route("**/scan-tx**", async (route) => {
    const json = {
      data: {
        simulation: {},
        validation: {
          result_type: "Malicious",
          malicious_score: "0.9",
          attack_types: {
            transfer_farming: true,
            theft: true,
          },
          description:
            "A malicious transaction causes a transfer, draining the user's assets and tokens.",
        },
      },
      error: null,
    };
    await route.fulfill({ json });
  });
};

/**
 * Stubs scan-tx endpoint to return "suspicious" response
 * This simulates when BlockAid detects a suspicious transaction
 */
export const stubScanTxSuspicious = async (page: Page | BrowserContext) => {
  await page.route("**/scan-tx**", async (route) => {
    const json = {
      data: {
        simulation: {},
        validation: {
          result_type: "Warning",
          malicious_score: "0.5",
          attack_types: {},
          description:
            "This transaction has unusual patterns that may indicate risk. Proceed with caution.",
        },
      },
      error: null,
    };
    await route.fulfill({ json });
  });
};

/**
 * Stubs scan-tx endpoint to return "safe" (benign) response
 * This simulates when BlockAid confirms a transaction is safe
 */
export const stubScanTxSafe = async (page: Page | BrowserContext) => {
  await page.route("**/scan-tx**", async (route) => {
    const json = {
      data: {
        simulation: {},
        validation: {
          result_type: "Benign",
          malicious_score: "0.0",
          attack_types: {},
        },
      },
      error: null,
    };
    await route.fulfill({ json });
  });
};

export const stubIsSac = async (page: Page | BrowserContext) => {
  await page.route("**/is-sac-contract**", async (route) => {
    const json = {
      isSacContract: false,
    };
    await route.fulfill({ json });
  });
};

export const stubTokenDetails = async (page: Page | BrowserContext) => {
  await page.route("**/token-details/**", async (route) => {
    const url = route.request().url();
    const parsedUrl = new URL(url);

    const pathParts = parsedUrl.pathname.split("/");
    const tokenId = pathParts[pathParts.length - 1];

    let json = {
      name: "native",
      decimals: 7,
      symbol: "native",
    };
    if (tokenId === TEST_TOKEN_ADDRESS) {
      json = {
        name: "E2E Token",
        decimals: 3,
        symbol: "E2E",
      };
    }
    await route.fulfill({ json });
  });
};

export const stubTokenPrices = async (page: Page | BrowserContext) => {
  await page.route("**/token-prices", async (route) => {
    const request = route.request();

    let tokenIds = [] as string[];
    if (request.method() === "POST") {
      try {
        const body = await request.postDataJSON();
        tokenIds = body.tokens || [];
      } catch (e) {
        console.error("Failed to parse POST body for token-prices", e);
      }
    }

    let json: {
      data: {
        [key: string]: {
          currentPrice: string;
          percentagePriceChange24h: string;
        };
      };
    } = {
      data: {},
    };

    for (const id of tokenIds) {
      json.data[id] = {
        currentPrice: "0.4079853099738737",
        percentagePriceChange24h: "1.022345803068746424",
      };
    }

    await route.fulfill({ json });
  });
};

export const stubAccountBalances = async (page: Page, xlmBalance?: string) => {
  await page.route("**/account-balances/**", async (route) => {
    const json = {
      balances: {
        native: {
          token: {
            type: "native",
            code: "XLM",
          },
          total: xlmBalance || "9697.8556678",
          available: xlmBalance || "9697.8556678",
          sellingLiabilities: "0",
          buyingLiabilities: "0",
          minimumBalance: "1",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address: "",
            metadata: {
              type: "",
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {},
          },
        },
      },
      isFunded: true,
      subentryCount: 0,
      error: {
        horizon: null,
        soroban: null,
      },
    };
    await route.fulfill({ json });
  });
};

export const stubAccountBalancesE2e = async (page: Page) => {
  const e2eAssetCode = `E2E:${TEST_TOKEN_ADDRESS}`;
  await page.route("**/account-balances/**", async (route) => {
    const json = {
      balances: {
        native: {
          token: {
            type: "native",
            code: "XLM",
          },
          total: "9697.8556678",
          available: "9697.8556678",
          sellingLiabilities: "0",
          buyingLiabilities: "0",
          minimumBalance: "1",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address: "",
            metadata: {
              type: "",
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {},
          },
        },
        [e2eAssetCode]: {
          token: {
            code: "E2E",
            issuer: {
              key: TEST_TOKEN_ADDRESS,
            },
          },
          contractId: TEST_TOKEN_ADDRESS,
          symbol: "E2E",
          decimals: 3,
          total: "100000099976",
          available: "100000099976",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address: "",
            metadata: {
              type: "",
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {},
          },
        },
      },
      isFunded: true,
      subentryCount: 0,
      error: {
        horizon: null,
        soroban: null,
      },
    };
    await route.fulfill({ json });
  });
};

export const stubAccountBalancesWithUSDC = async (page: Page) => {
  await page.route("**/account-balances/**", async (route) => {
    const json = {
      balances: {
        native: {
          token: {
            type: "native",
            code: "XLM",
          },
          total: "9697.8556678",
          available: "9697.8556678",
          sellingLiabilities: "0",
          buyingLiabilities: "0",
          minimumBalance: "1",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address: "",
            metadata: {
              type: "",
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {},
          },
        },
        "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5": {
          token: {
            type: "credit_alphanum4",
            code: "USDC",
            issuer: {
              key: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
            },
          },
          contractId: USDC_TOKEN_ADDRESS,
          total: "1000.0000000",
          available: "1000.0000000",
          sellingLiabilities: "0",
          buyingLiabilities: "0",
          limit: "922337203685.4775807",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address:
              "USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
            metadata: {
              type: "",
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {},
          },
        },
      },
      isFunded: true,
      subentryCount: 1,
      error: {
        horizon: null,
        soroban: null,
      },
    };
    await route.fulfill({ json });
  });
};

export const stubAccountHistory = async (page: Page) => {
  await page.route("**/account-history/**", async (route) => {
    const json = [
      {
        _links: {
          self: {
            href: "https://horizon-testnet.stellar.org/operations/3197787835473921",
          },
          transaction: {
            href: "https://horizon-testnet.stellar.org/transactions/10ef4cbaa88904b8a119dc818b315e1c1bee26797c5816b2773944bd201f0b3b",
          },
          effects: {
            href: "https://horizon-testnet.stellar.org/operations/3197787835473921/effects",
          },
          succeeds: {
            href: "https://horizon-testnet.stellar.org/effects?order=desc&cursor=3197787835473921",
          },
          precedes: {
            href: "https://horizon-testnet.stellar.org/effects?order=asc&cursor=3197787835473921",
          },
        },
        id: "3197787835473921",
        paging_token: "3197787835473921",
        transaction_successful: true,
        source_account:
          "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
        type: "invoke_host_function",
        type_i: 24,
        created_at: "2025-07-31T20:46:09Z",
        transaction_hash:
          "10ef4cbaa88904b8a119dc818b315e1c1bee26797c5816b2773944bd201f0b3b",
        function: "HostFunctionTypeHostFunctionTypeInvokeContract",
        parameters: [
          {
            value: "AAAAEgAAAAFvBADT+9vp6KPYVlhNu16wTjvsa/YS71l4R7rwMivdTQ==",
            type: "Address",
          },
          {
            value: "AAAADwAAAAh0cmFuc2Zlcg==",
            type: "Sym",
          },
          {
            value:
              "AAAAEgAAAAAAAAAAy70KCGxcPZNLYI2aDqy07iSWPZBxWKf2ABAJbf8Yq2w=",
            type: "Address",
          },
          {
            value: "AAAAEgAAAAFvBADT+9vp6KPYVlhNu16wTjvsa/YS71l4R7rwMivdTQ==",
            type: "Address",
          },
          {
            value: "AAAACgAAAAAAAAAAAAAAAAAAAAE=",
            type: "I128",
          },
        ],
        address: "",
        salt: "",
        asset_balance_changes: null,
        transaction_attr: {
          _links: {
            self: {
              href: "https://horizon-testnet.stellar.org/transactions/10ef4cbaa88904b8a119dc818b315e1c1bee26797c5816b2773944bd201f0b3b",
            },
            account: {
              href: "https://horizon-testnet.stellar.org/accounts/GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
            },
            ledger: {
              href: "https://horizon-testnet.stellar.org/ledgers/744543",
            },
            operations: {
              href: "https://horizon-testnet.stellar.org/transactions/10ef4cbaa88904b8a119dc818b315e1c1bee26797c5816b2773944bd201f0b3b/operations{?cursor,limit,order}",
              templated: true,
            },
            effects: {
              href: "https://horizon-testnet.stellar.org/transactions/10ef4cbaa88904b8a119dc818b315e1c1bee26797c5816b2773944bd201f0b3b/effects{?cursor,limit,order}",
              templated: true,
            },
            precedes: {
              href: "https://horizon-testnet.stellar.org/transactions?order=asc&cursor=3197787835473920",
            },
            succeeds: {
              href: "https://horizon-testnet.stellar.org/transactions?order=desc&cursor=3197787835473920",
            },
            transaction: {
              href: "https://horizon-testnet.stellar.org/transactions/10ef4cbaa88904b8a119dc818b315e1c1bee26797c5816b2773944bd201f0b3b",
            },
          },
          id: "10ef4cbaa88904b8a119dc818b315e1c1bee26797c5816b2773944bd201f0b3b",
          paging_token: "3197787835473920",
          successful: true,
          hash: "10ef4cbaa88904b8a119dc818b315e1c1bee26797c5816b2773944bd201f0b3b",
          created_at: "2025-07-31T20:46:09Z",
          source_account:
            "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
          source_account_sequence: "376114581078717",
          fee_account:
            "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
          fee_charged: "44663",
          max_fee: "83358",
          operation_count: 1,
          envelope_xdr:
            "AAAAAgAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAABRZ4AAVYTAAACvQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABbwQA0/vb6eij2FZYTbtesE477Gv2Eu9ZeEe68DIr3U0AAAAIdHJhbnNmZXIAAAADAAAAEgAAAAAAAAAAy70KCGxcPZNLYI2aDqy07iSWPZBxWKf2ABAJbf8Yq2wAAAASAAAAAW8EANP72+noo9hWWE27XrBOO+xr9hLvWXhHuvAyK91NAAAACgAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAABbwQA0/vb6eij2FZYTbtesE477Gv2Eu9ZeEe68DIr3U0AAAAIdHJhbnNmZXIAAAADAAAAEgAAAAAAAAAAy70KCGxcPZNLYI2aDqy07iSWPZBxWKf2ABAJbf8Yq2wAAAASAAAAAW8EANP72+noo9hWWE27XrBOO+xr9hLvWXhHuvAyK91NAAAACgAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAAAAAAACAAAABgAAAAFvBADT+9vp6KPYVlhNu16wTjvsa/YS71l4R7rwMivdTQAAABQAAAABAAAAByd3mtgVMtxJCm5+ZO+tENZxZh40hVjo3PBIBod5xiB0AAAAAgAAAAYAAAABbwQA0/vb6eij2FZYTbtesE477Gv2Eu9ZeEe68DIr3U0AAAAQAAAAAQAAAAIAAAAPAAAAB0JhbGFuY2UAAAAAEgAAAAAAAAAAy70KCGxcPZNLYI2aDqy07iSWPZBxWKf2ABAJbf8Yq2wAAAABAAAABgAAAAFvBADT+9vp6KPYVlhNu16wTjvsa/YS71l4R7rwMivdTQAAABAAAAABAAAAAgAAAA8AAAAHQmFsYW5jZQAAAAASAAAAAW8EANP72+noo9hWWE27XrBOO+xr9hLvWXhHuvAyK91NAAAAAQAOc7MAAAAAAAABJAAAAAAAAUU6AAAAAf8Yq2wAAABAAWJe8aWWdLtVBTB13RDwRYMAs4M6iuh+AzT6YWTV2v/Q6DXuFV7Vf709HuLM4qJ5kOhve9XiTQ+KuKh1hI7CDA==",
          result_xdr:
            "AAAAAAAArncAAAAAAAAAAQAAAAAAAAAYAAAAABVZ7UBBr+Xq1ZETmfxh8M8lL7AW3xk/RoTeMgmsmzAmAAAAAA==",
          fee_meta_xdr:
            "AAAAAgAAAAMAC1xcAAAAAAAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAAAABaUYAV9AAFWEwAAArwAAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAADAAAAAAALXFwAAAAAaIvWAgAAAAAAAAABAAtcXwAAAAAAAAAAy70KCGxcPZNLYI2aDqy07iSWPZBxWKf2ABAJbf8Yq2wAAAAWlF6/3wABVhMAAAK8AAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAwAAAAAAC1xcAAAAAGiL1gIAAAAA",
          memo_type: "none",
          signatures: [
            "AWJe8aWWdLtVBTB13RDwRYMAs4M6iuh+AzT6YWTV2v/Q6DXuFV7Vf709HuLM4qJ5kOhve9XiTQ+KuKh1hI7CDA==",
          ],
          preconditions: {
            timebounds: {
              min_time: "0",
            },
          },
          ledger_attr: 744543,
        },
      },
    ];
    await route.fulfill({ json });
  });
};

export const stubCollectibles = async (
  page: Page,
  shouldFailRefreshMetadata?: boolean,
) => {
  let tokenMetadataCount = 0;

  await page.route("**/tokenMetadata/1", async (route) => {
    const json = {
      name: "Stellar Frog 1",
      description: "This is a test frog",
      image:
        "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
      attributes: [
        {
          trait_type: "Background",
          value: "Green",
        },
      ],
      external_url: "https://nftcalendar.io/token/1",
    };
    if (tokenMetadataCount > 1 && shouldFailRefreshMetadata) {
      json.name = "Stellar Frog 1 (updated)";
      json.description = "This is a test frog (updated)";
      json.image =
        "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg";
      json.attributes = [
        {
          trait_type: "Background",
          value: "Green (updated)",
        },
      ];
    }
    tokenMetadataCount++;
    await route.fulfill({ json });
  });
  await page.route("**/tokenMetadata/2", async (route) => {
    const json = {
      name: "Stellar Frog 2",
      description: "This is a test frog 2",
      image:
        "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
      attributes: [
        {
          trait_type: "Background",
          value: "Green",
        },
      ],
      external_url: "https://nftcalendar.io/token/1",
    };
    await route.fulfill({ json });
  });
  await page.route("**/tokenMetadata/3", async (route) => {
    const json = {
      name: "Stellar Frog 3",
      description: "This is a test frog 3",
      image:
        "https://nftcalendar.io/storage/uploads/events/2023/8/5kFeYwNfhpUST3TsSoLxm7FaGY1ljwLRgfZ5gQnV.jpg",
      attributes: [
        {
          trait_type: "Background",
          value: "Blue",
        },
      ],
      external_url: "https://nftcalendar.io/token/3",
    };
    await route.fulfill({ json });
  });
  await page.route("**/tokenMetadata/102510", async (route) => {
    const json = {
      name: "Soroban Domain 1",
      description: "This is a test domain 1",
      image:
        "https://nftcalendar.io/storage/uploads/events/2025/7/Hdqv6YNVErVCmYlwobFVYfS5BiH19ferUgQova7Z.webp",
      attributes: [
        {
          trait_type: "Background",
          value: "Green",
        },
      ],
      external_url: "https://nftcalendar.io/token/102510",
    };
    await route.fulfill({ json });
  });
  await page.route("**/tokenMetadata/102589", async (route) => {
    const json = {
      name: "Soroban Domain 2",
      description: "This is a test domain 2",
      image:
        "https://nftcalendar.io/storage/uploads/events/2025/7/MkaASwOL8VA3I5B2iIfCcNGT29vGBp4YZIJgmjzq.jpg",
      attributes: [
        {
          trait_type: "Background",
          value: "Red",
        },
      ],
      external_url: "https://nftcalendar.io/token/102589",
    };
    await route.fulfill({ json });
  });
  await page.route("**/tokenMetadata/111", async (route) => {
    const json = {
      name: "Future Monkey 1",
      description: "This is a test monkey 1",
      image:
        "https://nftcalendar.io/storage/uploads/events/2025/3/oUfeUrSj3KcVnjColyfnS5ICYuqzDbiuqQP4qLIz.png",
      attributes: [
        {
          trait_type: "Background",
          value: "Blue",
        },
      ],
      external_url: "https://nftcalendar.io/token/111",
    };
    await route.fulfill({ json });
  });
  await page.route("**/collectibles**", async (route) => {
    const json = {
      data: {
        collections: [
          // Stellar Frogs Collection
          {
            collection: {
              address:
                "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN", // Using XLM contract address for testing
              name: "Stellar Frogs",
              symbol: "SFROG",
              collectibles: [
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "1",
                  token_uri: "https://nftcalendar.io/tokenMetadata/1",
                },
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "2",
                  token_uri: "https://nftcalendar.io/tokenMetadata/2",
                },
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "3",
                  token_uri: "https://nftcalendar.io/tokenMetadata/3",
                },
              ],
            },
          },
          // Soroban Domains Collection
          {
            collection: {
              address: "CCCSorobanDomainsCollection",
              name: "Soroban Domains",
              symbol: "SDOM",
              collectibles: [
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "102510",
                  token_uri: "https://nftcalendar.io/tokenMetadata/102510",
                },
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "102589",
                  token_uri: "https://nftcalendar.io/tokenMetadata/102589",
                },
              ],
            },
          },
          // Future Monkeys Collection
          {
            collection: {
              address: "CCCFutureMonkeysCollection",
              name: "Future Monkeys",
              symbol: "FMONK",
              collectibles: [
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "111",
                  token_uri: "https://nftcalendar.io/tokenMetadata/111",
                },
              ],
            },
          },
        ],
      },
    };
    await route.fulfill({ json });
  });
};

export const stubCollectiblesUnsuccessfulMetadata = async (page: Page) => {
  await page.route("**/tokenMetadata/1", async (route) => {
    const json = {
      name: "Stellar Frog 1",
      description: "This is a test frog",
      image:
        "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
      attributes: [
        {
          traitType: "Background",
          value: "Green",
        },
      ],
      external_url: "https://nftcalendar.io/token/1",
    };
    await route.fulfill({ json });
  });
  await page.route("**/tokenMetadata/2", async (route) => {
    const json = {
      name: "Stellar Frog 2",
      description: "This is a test frog 2",
      image:
        "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
      attributes: [
        {
          traitType: "Background",
          value: "Green",
        },
      ],
      external_url: "https://nftcalendar.io/token/1",
    };
    await route.fulfill({ json });
  });
  await page.route("**/tokenMetadata/3", async (route) => {
    const json = {};
    await route.fulfill({ json, status: 404 });
  });

  await page.route("**/collectibles**", async (route) => {
    const json = {
      data: {
        collections: [
          // Stellar Frogs Collection
          {
            collection: {
              address:
                "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN", // Using XLM contract address for testing
              name: "Stellar Frogs",
              symbol: "SFROG",
              collectibles: [
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "1",
                  token_uri: "https://nftcalendar.io/tokenMetadata/1",
                },
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "2",
                  token_uri: "https://nftcalendar.io/tokenMetadata/2",
                },
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "3",
                  token_uri: "https://nftcalendar.io/tokenMetadata/3",
                },
              ],
            },
          },
        ],
      },
    };
    await route.fulfill({ json });
  });
};

/**
 * Stubs contract spec API to simulate Soroban mux support (SEP-23) or lack thereof
 * @param page - Playwright page or browser context
 * @param contractId - Contract ID to stub
 * @param supportsMuxed - Whether the contract supports muxed addresses (Soroban mux support)
 *   - true: Contract has to_muxed parameter -> memo IS supported
 *   - false: Contract only has 'to' parameter (no to_muxed) -> memo is NOT supported
 */
export const stubContractSpec = async (
  page: Page | BrowserContext,
  contractId: string,
  supportsMuxed: boolean = false,
) => {
  // Route pattern should match: {INDEXER_URL}/contract-spec/{contractId}?network={network}
  await page.route("**/contract-spec/**", async (route) => {
    const url = route.request().url();
    try {
      const urlObj = new URL(url);
      const urlPath = urlObj.pathname;
      // Match /contract-spec/{contractId} pattern (with optional query params)
      // The URL format is: {INDEXER_URL}/contract-spec/{contractId}?network={network}
      const contractSpecMatch = urlPath.match(/\/contract-spec\/([^/?]+)/);
      if (!contractSpecMatch || contractSpecMatch[1] !== contractId) {
        await route.continue();
        return;
      }

      // Ensure we're handling GET requests (contract-spec is a GET endpoint)
      if (route.request().method() !== "GET") {
        await route.continue();
        return;
      }
    } catch (e) {
      // If URL parsing fails, continue
      await route.continue();
      return;
    }

    const spec = supportsMuxed
      ? {
          definitions: {
            transfer: {
              properties: {
                args: {
                  properties: {
                    to_muxed: {
                      type: "object",
                    },
                  },
                  required: ["to_muxed"],
                },
              },
            },
          },
        }
      : {
          definitions: {
            transfer: {
              properties: {
                args: {
                  properties: {
                    to: {
                      type: "object",
                    },
                  },
                  required: ["to"],
                },
              },
            },
          },
        };

    // Return wrapped in data property to match backend response format
    // Extension expects { data, error } format from INDEXER_URL/contract-spec endpoint
    await route.fulfill({ json: { data: spec, error: null } });
  });
};

/**
 * Stubs the simulate-token-transfer endpoint for Soroban token transfers
 * @param page - Playwright page or browser context
 */
export const stubSimulateTokenTransfer = async (
  page: Page | BrowserContext,
) => {
  await page.route("**/simulate-token-transfer", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    // Return a successful simulation response matching backend format
    // Backend returns: { simulationResponse: {...}, preparedTransaction: "..." }
    const json = {
      simulationResponse: {
        _parsed: true,
        latestLedger: 60969445,
        events: [
          {
            _attributes: {
              inSuccessfulContractCall: true,
              event: {
                _attributes: {
                  ext: {
                    _switch: 0,
                  },
                  type: {
                    name: "diagnostic",
                    value: 2,
                  },
                  body: {
                    _switch: 0,
                    _arm: "v0",
                    _value: {
                      _attributes: {
                        topics: [
                          {
                            _switch: {
                              name: "scvSymbol",
                              value: 15,
                            },
                            _arm: "sym",
                            _armType: {
                              _maxLength: 32,
                            },
                            _value: {
                              type: "Buffer",
                              data: [102, 110, 95, 99, 97, 108, 108],
                            },
                          },
                          {
                            _switch: {
                              name: "scvBytes",
                              value: 13,
                            },
                            _arm: "bytes",
                            _armType: {
                              _maxLength: 4294967295,
                            },
                            _value: {
                              type: "Buffer",
                              data: [
                                51, 120, 205, 202, 109, 33, 164, 194, 5, 219,
                                69, 26, 124, 216, 96, 210, 220, 233, 172, 131,
                                124, 131, 55, 133, 20, 250, 59, 61, 195, 99,
                                234, 75,
                              ],
                            },
                          },
                          {
                            _switch: {
                              name: "scvSymbol",
                              value: 15,
                            },
                            _arm: "sym",
                            _armType: {
                              _maxLength: 32,
                            },
                            _value: {
                              type: "Buffer",
                              data: [116, 114, 97, 110, 115, 102, 101, 114],
                            },
                          },
                        ],
                        data: {
                          _switch: {
                            name: "scvVec",
                            value: 16,
                          },
                          _arm: "vec",
                          _armType: {
                            _childType: {
                              _maxLength: 2147483647,
                            },
                          },
                          _value: [
                            {
                              _switch: {
                                name: "scvAddress",
                                value: 18,
                              },
                              _arm: "address",
                              _value: {
                                _switch: {
                                  name: "scAddressTypeAccount",
                                  value: 0,
                                },
                                _arm: "accountId",
                                _value: {
                                  _switch: {
                                    name: "publicKeyTypeEd25519",
                                    value: 0,
                                  },
                                  _arm: "ed25519",
                                  _armType: {
                                    _length: 32,
                                  },
                                  _value: {
                                    type: "Buffer",
                                    data: [
                                      103, 128, 20, 230, 110, 101, 50, 114, 161,
                                      182, 112, 3, 7, 114, 137, 146, 71, 205,
                                      29, 71, 49, 173, 43, 60, 76, 234, 6, 247,
                                      203, 36, 131, 228,
                                    ],
                                  },
                                },
                              },
                            },
                            {
                              _switch: {
                                name: "scvAddress",
                                value: 18,
                              },
                              _arm: "address",
                              _value: {
                                _switch: {
                                  name: "scAddressTypeAccount",
                                  value: 0,
                                },
                                _arm: "accountId",
                                _value: {
                                  _switch: {
                                    name: "publicKeyTypeEd25519",
                                    value: 0,
                                  },
                                  _arm: "ed25519",
                                  _armType: {
                                    _length: 32,
                                  },
                                  _value: {
                                    type: "Buffer",
                                    data: [
                                      103, 128, 20, 230, 110, 101, 50, 114, 161,
                                      182, 112, 3, 7, 114, 137, 146, 71, 205,
                                      29, 71, 49, 173, 43, 60, 76, 234, 6, 247,
                                      203, 36, 131, 228,
                                    ],
                                  },
                                },
                              },
                            },
                            {
                              _switch: {
                                name: "scvI128",
                                value: 10,
                              },
                              _arm: "i128",
                              _value: {
                                _attributes: {
                                  hi: {
                                    _value: "0",
                                  },
                                  lo: {
                                    _value: "100000",
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          {
            _attributes: {
              inSuccessfulContractCall: true,
              event: {
                _attributes: {
                  ext: {
                    _switch: 0,
                  },
                  contractId: {
                    type: "Buffer",
                    data: [
                      51, 120, 205, 202, 109, 33, 164, 194, 5, 219, 69, 26, 124,
                      216, 96, 210, 220, 233, 172, 131, 124, 131, 55, 133, 20,
                      250, 59, 61, 195, 99, 234, 75,
                    ],
                  },
                  type: {
                    name: "contract",
                    value: 1,
                  },
                  body: {
                    _switch: 0,
                    _arm: "v0",
                    _value: {
                      _attributes: {
                        topics: [
                          {
                            _switch: {
                              name: "scvSymbol",
                              value: 15,
                            },
                            _arm: "sym",
                            _armType: {
                              _maxLength: 32,
                            },
                            _value: {
                              type: "Buffer",
                              data: [116, 114, 97, 110, 115, 102, 101, 114],
                            },
                          },
                          {
                            _switch: {
                              name: "scvAddress",
                              value: 18,
                            },
                            _arm: "address",
                            _value: {
                              _switch: {
                                name: "scAddressTypeAccount",
                                value: 0,
                              },
                              _arm: "accountId",
                              _value: {
                                _switch: {
                                  name: "publicKeyTypeEd25519",
                                  value: 0,
                                },
                                _arm: "ed25519",
                                _armType: {
                                  _length: 32,
                                },
                                _value: {
                                  type: "Buffer",
                                  data: [
                                    103, 128, 20, 230, 110, 101, 50, 114, 161,
                                    182, 112, 3, 7, 114, 137, 146, 71, 205, 29,
                                    71, 49, 173, 43, 60, 76, 234, 6, 247, 203,
                                    36, 131, 228,
                                  ],
                                },
                              },
                            },
                          },
                          {
                            _switch: {
                              name: "scvAddress",
                              value: 18,
                            },
                            _arm: "address",
                            _value: {
                              _switch: {
                                name: "scAddressTypeAccount",
                                value: 0,
                              },
                              _arm: "accountId",
                              _value: {
                                _switch: {
                                  name: "publicKeyTypeEd25519",
                                  value: 0,
                                },
                                _arm: "ed25519",
                                _armType: {
                                  _length: 32,
                                },
                                _value: {
                                  type: "Buffer",
                                  data: [
                                    103, 128, 20, 230, 110, 101, 50, 114, 161,
                                    182, 112, 3, 7, 114, 137, 146, 71, 205, 29,
                                    71, 49, 173, 43, 60, 76, 234, 6, 247, 203,
                                    36, 131, 228,
                                  ],
                                },
                              },
                            },
                          },
                        ],
                        data: {
                          _switch: {
                            name: "scvI128",
                            value: 10,
                          },
                          _arm: "i128",
                          _value: {
                            _attributes: {
                              hi: {
                                _value: "0",
                              },
                              lo: {
                                _value: "100000",
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          {
            _attributes: {
              inSuccessfulContractCall: true,
              event: {
                _attributes: {
                  ext: {
                    _switch: 0,
                  },
                  contractId: {
                    type: "Buffer",
                    data: [
                      51, 120, 205, 202, 109, 33, 164, 194, 5, 219, 69, 26, 124,
                      216, 96, 210, 220, 233, 172, 131, 124, 131, 55, 133, 20,
                      250, 59, 61, 195, 99, 234, 75,
                    ],
                  },
                  type: {
                    name: "diagnostic",
                    value: 2,
                  },
                  body: {
                    _switch: 0,
                    _arm: "v0",
                    _value: {
                      _attributes: {
                        topics: [
                          {
                            _switch: {
                              name: "scvSymbol",
                              value: 15,
                            },
                            _arm: "sym",
                            _armType: {
                              _maxLength: 32,
                            },
                            _value: {
                              type: "Buffer",
                              data: [
                                102, 110, 95, 114, 101, 116, 117, 114, 110,
                              ],
                            },
                          },
                          {
                            _switch: {
                              name: "scvSymbol",
                              value: 15,
                            },
                            _arm: "sym",
                            _armType: {
                              _maxLength: 32,
                            },
                            _value: {
                              type: "Buffer",
                              data: [116, 114, 97, 110, 115, 102, 101, 114],
                            },
                          },
                        ],
                        data: {
                          _switch: {
                            name: "scvVoid",
                            value: 1,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        ],
        transactionData: {
          _data: {
            _attributes: {
              ext: {
                _switch: 0,
              },
              resources: {
                _attributes: {
                  footprint: {
                    _attributes: {
                      readOnly: [
                        {
                          _switch: {
                            name: "contractData",
                            value: 6,
                          },
                          _arm: "contractData",
                          _value: {
                            _attributes: {
                              contract: {
                                _switch: {
                                  name: "scAddressTypeContract",
                                  value: 1,
                                },
                                _arm: "contractId",
                                _armType: {
                                  _length: 32,
                                },
                                _value: {
                                  type: "Buffer",
                                  data: [
                                    51, 120, 205, 202, 109, 33, 164, 194, 5,
                                    219, 69, 26, 124, 216, 96, 210, 220, 233,
                                    172, 131, 124, 131, 55, 133, 20, 250, 59,
                                    61, 195, 99, 234, 75,
                                  ],
                                },
                              },
                              key: {
                                _switch: {
                                  name: "scvLedgerKeyContractInstance",
                                  value: 20,
                                },
                              },
                              durability: {
                                name: "persistent",
                                value: 1,
                              },
                            },
                          },
                        },
                        {
                          _switch: {
                            name: "contractCode",
                            value: 7,
                          },
                          _arm: "contractCode",
                          _value: {
                            _attributes: {
                              hash: {
                                type: "Buffer",
                                data: [
                                  144, 12, 51, 182, 156, 190, 52, 116, 141, 244,
                                  68, 63, 118, 129, 119, 90, 2, 179, 5, 153,
                                  227, 186, 185, 199, 201, 248, 179, 34, 90, 59,
                                  31, 27,
                                ],
                              },
                            },
                          },
                        },
                      ],
                      readWrite: [
                        {
                          _switch: {
                            name: "contractData",
                            value: 6,
                          },
                          _arm: "contractData",
                          _value: {
                            _attributes: {
                              contract: {
                                _switch: {
                                  name: "scAddressTypeContract",
                                  value: 1,
                                },
                                _arm: "contractId",
                                _armType: {
                                  _length: 32,
                                },
                                _value: {
                                  type: "Buffer",
                                  data: [
                                    51, 120, 205, 202, 109, 33, 164, 194, 5,
                                    219, 69, 26, 124, 216, 96, 210, 220, 233,
                                    172, 131, 124, 131, 55, 133, 20, 250, 59,
                                    61, 195, 99, 234, 75,
                                  ],
                                },
                              },
                              key: {
                                _switch: {
                                  name: "scvVec",
                                  value: 16,
                                },
                                _arm: "vec",
                                _armType: {
                                  _childType: {
                                    _maxLength: 2147483647,
                                  },
                                },
                                _value: [
                                  {
                                    _switch: {
                                      name: "scvSymbol",
                                      value: 15,
                                    },
                                    _arm: "sym",
                                    _armType: {
                                      _maxLength: 32,
                                    },
                                    _value: {
                                      type: "Buffer",
                                      data: [66, 97, 108, 97, 110, 99, 101],
                                    },
                                  },
                                  {
                                    _switch: {
                                      name: "scvAddress",
                                      value: 18,
                                    },
                                    _arm: "address",
                                    _value: {
                                      _switch: {
                                        name: "scAddressTypeAccount",
                                        value: 0,
                                      },
                                      _arm: "accountId",
                                      _value: {
                                        _switch: {
                                          name: "publicKeyTypeEd25519",
                                          value: 0,
                                        },
                                        _arm: "ed25519",
                                        _armType: {
                                          _length: 32,
                                        },
                                        _value: {
                                          type: "Buffer",
                                          data: [
                                            103, 128, 20, 230, 110, 101, 50,
                                            114, 161, 182, 112, 3, 7, 114, 137,
                                            146, 71, 205, 29, 71, 49, 173, 43,
                                            60, 76, 234, 6, 247, 203, 36, 131,
                                            228,
                                          ],
                                        },
                                      },
                                    },
                                  },
                                ],
                              },
                              durability: {
                                name: "persistent",
                                value: 1,
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                  instructions: 817757,
                  diskReadBytes: 0,
                  writeBytes: 148,
                },
              },
              resourceFee: {
                _value: "93238",
              },
            },
          },
        },
        minResourceFee: "93238",
        result: {
          auth: [
            {
              _attributes: {
                credentials: {
                  _switch: {
                    name: "sorobanCredentialsSourceAccount",
                    value: 0,
                  },
                },
                rootInvocation: {
                  _attributes: {
                    function: {
                      _switch: {
                        name: "sorobanAuthorizedFunctionTypeContractFn",
                        value: 0,
                      },
                      _arm: "contractFn",
                      _value: {
                        _attributes: {
                          contractAddress: {
                            _switch: {
                              name: "scAddressTypeContract",
                              value: 1,
                            },
                            _arm: "contractId",
                            _armType: {
                              _length: 32,
                            },
                            _value: {
                              type: "Buffer",
                              data: [
                                51, 120, 205, 202, 109, 33, 164, 194, 5, 219,
                                69, 26, 124, 216, 96, 210, 220, 233, 172, 131,
                                124, 131, 55, 133, 20, 250, 59, 61, 195, 99,
                                234, 75,
                              ],
                            },
                          },
                          functionName: {
                            type: "Buffer",
                            data: [116, 114, 97, 110, 115, 102, 101, 114],
                          },
                          args: [
                            {
                              _switch: {
                                name: "scvAddress",
                                value: 18,
                              },
                              _arm: "address",
                              _value: {
                                _switch: {
                                  name: "scAddressTypeAccount",
                                  value: 0,
                                },
                                _arm: "accountId",
                                _value: {
                                  _switch: {
                                    name: "publicKeyTypeEd25519",
                                    value: 0,
                                  },
                                  _arm: "ed25519",
                                  _armType: {
                                    _length: 32,
                                  },
                                  _value: {
                                    type: "Buffer",
                                    data: [
                                      103, 128, 20, 230, 110, 101, 50, 114, 161,
                                      182, 112, 3, 7, 114, 137, 146, 71, 205,
                                      29, 71, 49, 173, 43, 60, 76, 234, 6, 247,
                                      203, 36, 131, 228,
                                    ],
                                  },
                                },
                              },
                            },
                            {
                              _switch: {
                                name: "scvAddress",
                                value: 18,
                              },
                              _arm: "address",
                              _value: {
                                _switch: {
                                  name: "scAddressTypeAccount",
                                  value: 0,
                                },
                                _arm: "accountId",
                                _value: {
                                  _switch: {
                                    name: "publicKeyTypeEd25519",
                                    value: 0,
                                  },
                                  _arm: "ed25519",
                                  _armType: {
                                    _length: 32,
                                  },
                                  _value: {
                                    type: "Buffer",
                                    data: [
                                      103, 128, 20, 230, 110, 101, 50, 114, 161,
                                      182, 112, 3, 7, 114, 137, 146, 71, 205,
                                      29, 71, 49, 173, 43, 60, 76, 234, 6, 247,
                                      203, 36, 131, 228,
                                    ],
                                  },
                                },
                              },
                            },
                            {
                              _switch: {
                                name: "scvI128",
                                value: 10,
                              },
                              _arm: "i128",
                              _value: {
                                _attributes: {
                                  hi: {
                                    _value: "0",
                                  },
                                  lo: {
                                    _value: "100000",
                                  },
                                },
                              },
                            },
                          ],
                        },
                      },
                    },
                    subInvocations: [],
                  },
                },
              },
            },
          ],
          retval: {
            _switch: {
              name: "scvVoid",
              value: 1,
            },
          },
        },
        stateChanges: [
          {
            type: "updated",
            key: {
              _switch: {
                name: "contractData",
                value: 6,
              },
              _arm: "contractData",
              _value: {
                _attributes: {
                  contract: {
                    _switch: {
                      name: "scAddressTypeContract",
                      value: 1,
                    },
                    _arm: "contractId",
                    _armType: {
                      _length: 32,
                    },
                    _value: {
                      type: "Buffer",
                      data: [
                        51, 120, 205, 202, 109, 33, 164, 194, 5, 219, 69, 26,
                        124, 216, 96, 210, 220, 233, 172, 131, 124, 131, 55,
                        133, 20, 250, 59, 61, 195, 99, 234, 75,
                      ],
                    },
                  },
                  key: {
                    _switch: {
                      name: "scvVec",
                      value: 16,
                    },
                    _arm: "vec",
                    _armType: {
                      _childType: {
                        _maxLength: 2147483647,
                      },
                    },
                    _value: [
                      {
                        _switch: {
                          name: "scvSymbol",
                          value: 15,
                        },
                        _arm: "sym",
                        _armType: {
                          _maxLength: 32,
                        },
                        _value: {
                          type: "Buffer",
                          data: [66, 97, 108, 97, 110, 99, 101],
                        },
                      },
                      {
                        _switch: {
                          name: "scvAddress",
                          value: 18,
                        },
                        _arm: "address",
                        _value: {
                          _switch: {
                            name: "scAddressTypeAccount",
                            value: 0,
                          },
                          _arm: "accountId",
                          _value: {
                            _switch: {
                              name: "publicKeyTypeEd25519",
                              value: 0,
                            },
                            _arm: "ed25519",
                            _armType: {
                              _length: 32,
                            },
                            _value: {
                              type: "Buffer",
                              data: [
                                103, 128, 20, 230, 110, 101, 50, 114, 161, 182,
                                112, 3, 7, 114, 137, 146, 71, 205, 29, 71, 49,
                                173, 43, 60, 76, 234, 6, 247, 203, 36, 131, 228,
                              ],
                            },
                          },
                        },
                      },
                    ],
                  },
                  durability: {
                    name: "persistent",
                    value: 1,
                  },
                },
              },
            },
            before: {
              _attributes: {
                lastModifiedLedgerSeq: 60906681,
                data: {
                  _switch: {
                    name: "contractData",
                    value: 6,
                  },
                  _arm: "contractData",
                  _value: {
                    _attributes: {
                      ext: {
                        _switch: 0,
                      },
                      contract: {
                        _switch: {
                          name: "scAddressTypeContract",
                          value: 1,
                        },
                        _arm: "contractId",
                        _armType: {
                          _length: 32,
                        },
                        _value: {
                          type: "Buffer",
                          data: [
                            51, 120, 205, 202, 109, 33, 164, 194, 5, 219, 69,
                            26, 124, 216, 96, 210, 220, 233, 172, 131, 124, 131,
                            55, 133, 20, 250, 59, 61, 195, 99, 234, 75,
                          ],
                        },
                      },
                      key: {
                        _switch: {
                          name: "scvVec",
                          value: 16,
                        },
                        _arm: "vec",
                        _armType: {
                          _childType: {
                            _maxLength: 2147483647,
                          },
                        },
                        _value: [
                          {
                            _switch: {
                              name: "scvSymbol",
                              value: 15,
                            },
                            _arm: "sym",
                            _armType: {
                              _maxLength: 32,
                            },
                            _value: {
                              type: "Buffer",
                              data: [66, 97, 108, 97, 110, 99, 101],
                            },
                          },
                          {
                            _switch: {
                              name: "scvAddress",
                              value: 18,
                            },
                            _arm: "address",
                            _value: {
                              _switch: {
                                name: "scAddressTypeAccount",
                                value: 0,
                              },
                              _arm: "accountId",
                              _value: {
                                _switch: {
                                  name: "publicKeyTypeEd25519",
                                  value: 0,
                                },
                                _arm: "ed25519",
                                _armType: {
                                  _length: 32,
                                },
                                _value: {
                                  type: "Buffer",
                                  data: [
                                    103, 128, 20, 230, 110, 101, 50, 114, 161,
                                    182, 112, 3, 7, 114, 137, 146, 71, 205, 29,
                                    71, 49, 173, 43, 60, 76, 234, 6, 247, 203,
                                    36, 131, 228,
                                  ],
                                },
                              },
                            },
                          },
                        ],
                      },
                      durability: {
                        name: "persistent",
                        value: 1,
                      },
                      val: {
                        _switch: {
                          name: "scvI128",
                          value: 10,
                        },
                        _arm: "i128",
                        _value: {
                          _attributes: {
                            hi: {
                              _value: "0",
                            },
                            lo: {
                              _value: "109268289",
                            },
                          },
                        },
                      },
                    },
                  },
                },
                ext: {
                  _switch: 0,
                },
              },
            },
            after: {
              _attributes: {
                lastModifiedLedgerSeq: 60906681,
                data: {
                  _switch: {
                    name: "contractData",
                    value: 6,
                  },
                  _arm: "contractData",
                  _value: {
                    _attributes: {
                      ext: {
                        _switch: 0,
                      },
                      contract: {
                        _switch: {
                          name: "scAddressTypeContract",
                          value: 1,
                        },
                        _arm: "contractId",
                        _armType: {
                          _length: 32,
                        },
                        _value: {
                          type: "Buffer",
                          data: [
                            51, 120, 205, 202, 109, 33, 164, 194, 5, 219, 69,
                            26, 124, 216, 96, 210, 220, 233, 172, 131, 124, 131,
                            55, 133, 20, 250, 59, 61, 195, 99, 234, 75,
                          ],
                        },
                      },
                      key: {
                        _switch: {
                          name: "scvVec",
                          value: 16,
                        },
                        _arm: "vec",
                        _armType: {
                          _childType: {
                            _maxLength: 2147483647,
                          },
                        },
                        _value: [
                          {
                            _switch: {
                              name: "scvSymbol",
                              value: 15,
                            },
                            _arm: "sym",
                            _armType: {
                              _maxLength: 32,
                            },
                            _value: {
                              type: "Buffer",
                              data: [66, 97, 108, 97, 110, 99, 101],
                            },
                          },
                          {
                            _switch: {
                              name: "scvAddress",
                              value: 18,
                            },
                            _arm: "address",
                            _value: {
                              _switch: {
                                name: "scAddressTypeAccount",
                                value: 0,
                              },
                              _arm: "accountId",
                              _value: {
                                _switch: {
                                  name: "publicKeyTypeEd25519",
                                  value: 0,
                                },
                                _arm: "ed25519",
                                _armType: {
                                  _length: 32,
                                },
                                _value: {
                                  type: "Buffer",
                                  data: [
                                    103, 128, 20, 230, 110, 101, 50, 114, 161,
                                    182, 112, 3, 7, 114, 137, 146, 71, 205, 29,
                                    71, 49, 173, 43, 60, 76, 234, 6, 247, 203,
                                    36, 131, 228,
                                  ],
                                },
                              },
                            },
                          },
                        ],
                      },
                      durability: {
                        name: "persistent",
                        value: 1,
                      },
                      val: {
                        _switch: {
                          name: "scvI128",
                          value: 10,
                        },
                        _arm: "i128",
                        _value: {
                          _attributes: {
                            hi: {
                              _value: "0",
                            },
                            lo: {
                              _value: "109268289",
                            },
                          },
                        },
                      },
                    },
                  },
                },
                ext: {
                  _switch: 0,
                },
              },
            },
          },
        ],
      },
      preparedTransaction:
        "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AABbJoCjnUGAAABwgAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABM3jNym0hpMIF20UafNhg0tzprIN8gzeFFPo7PcNj6ksAAAAIdHJhbnNmZXIAAAADAAAAEgAAAAAAAAAAZ4AU5m5lMnKhtnADB3KJkkfNHUcxrSs8TOoG98skg+QAAAASAAAAAAAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAoAAAAAAAAAAAAAAAAAAYagAAAAAQAAAAAAAAAAAAAAATN4zcptIaTCBdtFGnzYYNLc6ayDfIM3hRT6Oz3DY+pLAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAGeAFOZuZTJyobZwAwdyiZJHzR1HMa0rPEzqBvfLJIPkAAAAEgAAAAAAAAAAZ4AU5m5lMnKhtnADB3KJkkfNHUcxrSs8TOoG98skg+QAAAAKAAAAAAAAAAAAAAAAAAGGoAAAAAAAAAABAAAAAAAAAAIAAAAGAAAAATN4zcptIaTCBdtFGnzYYNLc6ayDfIM3hRT6Oz3DY+pLAAAAFAAAAAEAAAAHkAwztpy+NHSN9EQ/doF3WgKzBZnjurnHyfizIlo7HxsAAAABAAAABgAAAAEzeM3KbSGkwgXbRRp82GDS3Omsg3yDN4UU+js9w2PqSwAAABAAAAABAAAAAgAAAA8AAAAHQmFsYW5jZQAAAAASAAAAAAAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAEADHpdAAAAAAAAAJQAAAAAAAFsNgAAAAA=",
    };

    await route.fulfill({ json, status: 200 });
  });
};

/**
 * Stubs the memo-required accounts API endpoint
 * @param page - Playwright page
 * @param memoRequiredAddress - Address that requires a memo
 */
export const stubMemoRequiredAccounts = async (
  page: Page,
  memoRequiredAddress: string,
) => {
  await page.route(
    "**/api.stellar.expert/explorer/directory**",
    async (route) => {
      const json = {
        _embedded: {
          records: [
            {
              address: memoRequiredAddress,
              tags: ["memo-required"],
            },
          ],
        },
      };
      await route.fulfill({ json });
    },
  );
};

export const stubSimulateSendCollectible = async (page: Page) => {
  await page.route("**/simulate-tx", async (route) => {
    const json = {
      preparedTransaction:
        "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AACQ3sCjnUGAAABkQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABp4YjrCeaVIvf6/Qjtqbnv4gmHScnZ/YgfjDVWV8aKUEAAAAIdHJhbnNmZXIAAAADAAAAEgAAAAAAAAAAZ4AU5m5lMnKhtnADB3KJkkfNHUcxrSs8TOoG98skg+QAAAASAAAAAAAAAABVZkfzT8IUCc68cala6hWfNx8vR5j+La0nQf3V+7AGYwAAAAMAAAACAAAAAQAAAAAAAAAAAAAAAaeGI6wnmlSL3+v0I7am57+IJh0nJ2f2IH4w1VlfGilBAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAGeAFOZuZTJyobZwAwdyiZJHzR1HMa0rPEzqBvfLJIPkAAAAEgAAAAAAAAAAVWZH80/CFAnOvHGpWuoVnzcfL0eY/i2tJ0H91fuwBmMAAAADAAAAAgAAAAAAAAABAAAAAAAAAAIAAAAGAAAAAaeGI6wnmlSL3+v0I7am57+IJh0nJ2f2IH4w1VlfGilBAAAAFAAAAAEAAAAHP3eS4onfldMZntnbNaDPKlFUqmTNcpioxEG3FwIwY1sAAAAGAAAABgAAAAGnhiOsJ5pUi9/r9CO2pue/iCYdJydn9iB+MNVZXxopQQAAABAAAAABAAAAAgAAAA8AAAAIQXBwcm92YWwAAAADAAAAAgAAAAAAAAAGAAAAAaeGI6wnmlSL3+v0I7am57+IJh0nJ2f2IH4w1VlfGilBAAAAEAAAAAEAAAACAAAADwAAAAdCYWxhbmNlAAAAABIAAAAAAAAAAFVmR/NPwhQJzrxxqVrqFZ83Hy9HmP4trSdB/dX7sAZjAAAAAQAAAAYAAAABp4YjrCeaVIvf6/Qjtqbnv4gmHScnZ/YgfjDVWV8aKUEAAAAQAAAAAQAAAAIAAAAPAAAAB0JhbGFuY2UAAAAAEgAAAAAAAAAAZ4AU5m5lMnKhtnADB3KJkkfNHUcxrSs8TOoG98skg+QAAAABAAAABgAAAAGnhiOsJ5pUi9/r9CO2pue/iCYdJydn9iB+MNVZXxopQQAAABAAAAABAAAAAgAAAA8AAAAFT3duZXIAAAAAAAADAAAAAgAAAAEAAAAGAAAAAaeGI6wnmlSL3+v0I7am57+IJh0nJ2f2IH4w1VlfGilBAAAAEAAAAAEAAAACAAAADwAAAAtPd25lclRva2VucwAAAAASAAAAAAAAAABVZkfzT8IUCc68cala6hWfNx8vR5j+La0nQf3V+7AGYwAAAAEAAAAGAAAAAaeGI6wnmlSL3+v0I7am57+IJh0nJ2f2IH4w1VlfGilBAAAAEAAAAAEAAAACAAAADwAAAAtPd25lclRva2VucwAAAAASAAAAAAAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAEAGSIiAAAAAAAAAsgAAAAAAAJDewAAAAA=",
      simulationResponse: {
        minResourceFee: "100",
      },
    };
    await route.fulfill({ json });
  });
};

export const stubScanTx = async (page: Page) => {
  await page.route("**/scan-tx", async (route) => {
    const json = {
      data: {
        simulation: {
          status: "Success",
        },
        validation: {
          status: "Success",
        },
      },
    };
    await route.fulfill({ json });
  });
};

export const stubSubmitTx = async (page: Page) => {
  await page.route("**/submit-tx", async (route) => {
    const json = {
      successful: true,
    };
    await route.fulfill({ json });
  });
};

export const stubFeeStats = async (page: Page) => {
  await page.route("**/fee_stats", async (route) => {
    const json = {
      last_ledger: "60377558",
      last_ledger_base_fee: "100",
      ledger_capacity_usage: "1.06",
      fee_charged: {
        max: "179360",
        min: "100",
        mode: "100",
        p10: "100",
        p20: "100",
        p30: "100",
        p40: "100",
        p50: "100",
        p60: "27565",
        p70: "27644",
        p80: "27644",
        p90: "27644",
        p95: "27644",
        p99: "62292",
      },
      max_fee: {
        max: "121200000",
        min: "100",
        mode: "100",
        p10: "101",
        p20: "2823",
        p30: "21009",
        p40: "46875",
        p50: "46875",
        p60: "46875",
        p70: "46875",
        p80: "100000",
        p90: "1000000",
        p95: "2000001",
        p99: "10000000",
      },
    };
    await route.fulfill({ json });
  });
};

/**
 * Comprehensive stub setup for all external API calls
 * Call this early in tests to ensure all external APIs are stubbed
 */
export const stubAllExternalApis = async (
  page: Page,
  context: BrowserContext,
) => {
  // User notification
  await stubUserNotification(context);

  // Feature flags
  await stubFeatureFlags(context);

  // Subscription account
  await stubSubscriptionAccount(context);

  // Stellar Asset List
  await stubStellarAssetList(page);
  await stubAssetSearch(page);

  // Token metadata
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubIsSac(page);

  // Horizon endpoints
  await stubFeeStats(page);
  await stubHorizonAccounts(page);
  await stubHorizonTransactions(page);

  // Backend transaction endpoints
  await stubBackendSimulateTx(page);
  await stubBackendSubmitTx(page);
  await stubSimulateTokenTransfer(page);

  // Federated address resolution
  await stubStellarToml(page);
  await stubFederation(page);

  // Friendbot (testnet funding)
  await stubFriendbot(page);

  // Account balances
  await stubDefaultAccountBalances(page);

  // Collectibles
  await stubCollectibles(page);

  // Mercury/History endpoints
  // Note: Tests that need account history should call stubAccountHistory() instead
  // to provide their own test data
  await stubAccountHistory(page);
  await stubMercuryTransactions(page);

  // RPC and Soroban
  await stubSorobanRpc(page);

  // Backend settings and health checks
  await stubBackendSettingsEndpoint(page);

  // Ledger keys accounts
  await stubLedgerKeysAccounts(page);

  // Blockaid scan
  await stubScanTx(page);
  await stubScanDapp(context);
};

export const stubBackendSettings = async (page: Page) => {
  await page.route("**/feature-flags", async (route) => {
    await route.fulfill({
      json: {
        useSorobanPublic: true,
      },
    });
  });

  await page.route("**/user-notification", async (route) => {
    await route.fulfill({
      json: {
        enabled: false,
        message: "",
      },
    });
  });
};

/**
 * Stub a specific API endpoint with custom response
 * Useful for test-specific overrides
 */
export const stubApiEndpoint = async (
  page: Page,
  pattern: string,
  response: any,
) => {
  await page.route(pattern, async (route) => {
    await route.fulfill({ json: response });
  });
};

/**
 * Abort a specific API endpoint
 * Useful for testing error handling
 */
export const abortApiEndpoint = async (page: Page, pattern: string) => {
  await page.route(pattern, async (route) => {
    await route.abort("failed");
  });
};

/**
 * Stubs scan-asset endpoint to return an HTTP 500 error
 * Simulates a backend failure during asset scanning
 */
export const stubScanAssetServerError = async (page: Page | BrowserContext) => {
  await page.route("**/scan-asset**", async (route) => {
    await route.fulfill({
      status: 500,
      json: { data: null, error: "Internal Server Error" },
    });
  });
};

/**
 * Stubs scan-tx endpoint to return an HTTP 500 error
 * Simulates a backend failure during transaction scanning
 */
export const stubScanTxServerError = async (page: Page | BrowserContext) => {
  await page.route("**/scan-tx**", async (route) => {
    await route.fulfill({
      status: 500,
      json: { data: null, error: "Internal Server Error" },
    });
  });
};

/**
 * Stubs scan-asset endpoint with a delayed response
 * Simulates a slow API response for testing race conditions
 */
export const stubScanAssetDelayed = async (
  page: Page | BrowserContext,
  delayMs: number,
) => {
  await page.route("**/scan-asset**", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    const json = {
      data: {
        result_type: "Benign",
        malicious_score: "0.0",
        attack_types: {},
        chain: "stellar",
        address: "",
        metadata: { type: "" },
        fees: {},
        features: [],
        trading_limits: {},
        financial_stats: {},
      },
      error: null,
    };
    await route.fulfill({ json });
  });
};
