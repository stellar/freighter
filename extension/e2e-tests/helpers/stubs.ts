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
        minResourceFee: "100",
        results: [],
        cost: {
          cpuInsns: "100",
          memBytes: "100",
        },
        transactionData: "",
        events: [],
        returnValue: "",
        auth: [],
        footprint: {
          readOnly: [],
          readWrite: [],
        },
      },
      preparedTransaction: "AAAAAgAAAAC8J8h+HyYyP4AAAAA=", // Mock XDR
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
