import { BrowserContext, Page } from "@playwright/test";
import { USDC_TOKEN_ADDRESS, TEST_TOKEN_ADDRESS } from "./test-token";

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
