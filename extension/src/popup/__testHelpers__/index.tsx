import React from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import BigNumber from "bignumber.js";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { Balances } from "@shared/api/types/backend-api";

import { reducer as auth } from "popup/ducks/accountServices";
import { reducer as settings } from "popup/ducks/settings";
import { reducer as cache } from "popup/ducks/cache";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import {
  reducer as transactionSubmission,
  initialState as transactionSubmissionInitialState,
} from "popup/ducks/transactionSubmission";
import { reducer as tokenPaymentSimulation } from "popup/ducks/token-payment";
import { WalletType } from "@shared/constants/hardwareWallet";
import { Account } from "@shared/api/types";

export const TEST_PUBLIC_KEY =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

export const TEST_CANONICAL =
  "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ";

const rootReducer = combineReducers({
  auth,
  settings,
  transactionSubmission,
  tokenPaymentSimulation,
  cache,
});

export const makeDummyStore = (state: any) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: state,
    middleware: (defaults) => defaults({ serializableCheck: false }),
  });

export const Wrapper: React.FunctionComponent<any> = ({
  children,
  state,
  routes,
}: {
  children: React.ReactNode;
  state: {};
  routes?: string[];
}) => {
  return (
    <MemoryRouter initialEntries={routes || []}>
      <Provider
        store={makeDummyStore({
          auth: {
            allAccounts: ["G123"],
            publicKey: "G123",
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          },
          transactionSubmission: transactionSubmissionInitialState,
          ...state,
        })}
      >
        {children}
      </Provider>
    </MemoryRouter>
  );
};

export const mockPrices = {
  [TEST_CANONICAL]: {
    currentPrice: "0.0008344636737229707",
    percentagePriceChange24h: "3.975563218688548378",
  },
  native: {
    currentPrice: "0.27633884304166495",
    percentagePriceChange24h: "1.09899728516430811",
  },
};

export const mockBalances = {
  balances: {
    [TEST_CANONICAL]: {
      token: {
        code: "DT",
        issuer: {
          key: "CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        },
      },
      decimals: 7,
      total: new BigNumber("1000000000"),
      available: new BigNumber("1000000000"),
      blockaidData: defaultBlockaidScanAssetResult,
    },
    ["USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"]: {
      token: {
        code: "USDC",
        issuer: {
          key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        },
      },
      total: new BigNumber("100"),
      available: new BigNumber("100"),
      blockaidData: {
        address:
          "USDC-GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        result_type: "Spam",
        features: [{ feature_id: "METADATA", description: "baz" }],
      },
    },
    native: {
      token: { type: "native", code: "XLM" },
      total: new BigNumber("50"),
      available: new BigNumber("50"),
      blockaidData: defaultBlockaidScanAssetResult,
    },
  } as any as Balances,
  isFunded: true,
  subentryCount: 1,
};

// balances with no blockaid spam data as we only do the scan on Mainnet
export const mockTestnetBalances = {
  balances: {
    [TEST_CANONICAL]: {
      token: {
        code: "DT",
        issuer: {
          key: "CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
        },
      },
      decimals: 7,
      total: new BigNumber("1000000000"),
      available: new BigNumber("1000000000"),
      blockaidData: defaultBlockaidScanAssetResult,
    },
    ["USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM"]: {
      token: {
        code: "USDC",
        issuer: {
          key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        },
      },
      total: new BigNumber("100"),
      available: new BigNumber("100"),
      blockaidData: defaultBlockaidScanAssetResult,
    },
    native: {
      token: { type: "native", code: "XLM" },
      total: new BigNumber("50"),
      available: new BigNumber("50"),
      blockaidData: defaultBlockaidScanAssetResult,
    },
  } as any as Balances,
  isFunded: true,
  subentryCount: 1,
};

export const mockTokenBalance = {
  balance: 10,
  decimals: 0,
  name: "Demo Token",
  symbol: "DT",
};

export const mockAccounts = [
  {
    hardwareWalletType: "" as WalletType,
    imported: false,
    name: "Account 1",
    publicKey: "G1",
  },
  {
    hardwareWalletType: "" as WalletType,
    imported: true,
    name: "Account 2",
    publicKey: "G2",
  },
  {
    hardwareWalletType: "Ledger" as WalletType,
    imported: true,
    name: "Ledger 1",
    publicKey: "L1",
  },
] as Account[];

export const mockAccountHistory = [
  {
    amount: "1.0000000",
    asset_type: "native",
    created_at: "2024-10-14T20:35:26Z",
    from: "G2",
    id: "5",
    paging_token: "1916427292381185",
    source_account: "G2",
    to: "G1",
    transaction_attr: {
      operation_count: 1,
    },
    transaction_hash:
      "0df82e64fe4aedaad771f4b64ceb4ebe33e9baff22c82090a29f671f4bbc1fba",
    transaction_successful: true,
    type: "payment",
    type_i: 1,
  },
  {
    amount: "0.1000000",
    asset_type: "native",
    created_at: "2024-10-14T20:35:26Z",
    from: "G2",
    id: "4",
    paging_token: "1916427292381185",
    source_account: "G2",
    to: "G1",
    transaction_attr: {
      operation_count: 1,
    },
    transaction_hash:
      "0df82e64fe4aedaad771f4b64ceb4ebe33e9baff22c82090a29f671f4bbc1fba",
    transaction_successful: true,
    type: "payment",
    type_i: 1,
  },
  {
    amount: "0.010000",
    asset_type: "native",
    created_at: "2024-10-14T20:35:26Z",
    from: "G2",
    id: "3",
    paging_token: "1916427292381185",
    source_account: "G2",
    to: "G1",
    transaction_attr: {
      operation_count: 1,
    },
    transaction_hash:
      "0df82e64fe4aedaad771f4b64ceb4ebe33e9baff22c82090a29f671f4bbc1fba",
    transaction_successful: true,
    type: "payment",
    type_i: 1,
  },
  {
    amount: "0.100000",
    asset_issuer: "G3",
    asset_code: "USDC",
    created_at: "2024-10-14T20:35:26Z",
    from: "G1",
    id: "2",
    paging_token: "1916427292381185",
    source_account: "G1",
    to: "G2",
    transaction_attr: {
      operation_count: 1,
    },
    transaction_hash:
      "0df82e64fe4aedaad771f4b64ceb4ebe33e9baff22c82090a29f671f4bbc1fba",
    transaction_successful: true,
    type: "payment",
    type_i: 1,
  },
];

export const validAssetList = {
  name: "PiyalBasu Top 50",
  provider: "PiyalBasu",
  description: "Test asset list schema",
  version: "1.0",
  network: "public",
  feedback: "https://piyalbasu.org",
  assets: [
    {
      code: "yXLM",
      issuer: "GARDNV3Q7YGT4AKSDF25LT32YSCCW4EV22Y2TV3I2PU2MMXJTEDL5T55",
      contract: "CBZVSNVB55ANF24QVJL2K5QCLOAB6XITGTGXYEAF6NPTXYKEJUYQOHFC",
      name: "yXLM",
      org: "Ultra Capital LLC dba Ultra Capital",
      domain: "ultracapital.xyz",
      icon: "https://ipfs.io/ipfs/bafkreihntcz2lpaxawmbhwidtuifladkgew6olwuly2dz5pewqillhhpay",
      decimals: 7,
    },
  ],
};

export const mockSelector = <T,>(
  selector: unknown,
  implementation: () => T,
) => {
  (selector as unknown as jest.Mock).mockImplementation(implementation);
};

export const mockCollectibles = [
  // Stellar Frogs Collection
  {
    collection: {
      address: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA", // Using XLM contract address for testing
      name: "Stellar Frogs",
      symbol: "SFROG",
      collectibles: [
        {
          owner: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
          token_id: "1",
          token_uri:
            "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
        },
        {
          owner: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
          token_id: "2",
          token_uri:
            "https://nftcalendar.io/storage/uploads/2024/06/02/pepe-the-bot_ml4cWknXFrF3K3U1.jpeg",
        },
        {
          owner: "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
          token_id: "3",
          token_uri:
            "https://nftcalendar.io/storage/uploads/events/2023/8/5kFeYwNfhpUST3TsSoLxm7FaGY1ljwLRgfZ5gQnV.jpg",
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
          owner: "CCCSorobanDomainsCollection",
          token_id: "102510",
          token_uri:
            "https://nftcalendar.io/storage/uploads/events/2025/7/Hdqv6YNVErVCmYlwobFVYfS5BiH19ferUgQova7Z.webp",
        },
        {
          owner: "CCCSorobanDomainsCollection",
          token_id: "102589",
          token_uri:
            "https://nftcalendar.io/storage/uploads/events/2025/7/MkaASwOL8VA3I5B2iIfCcNGT29vGBp4YZIJgmjzq.jpg",
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
          owner: "CCCFutureMonkeysCollection",
          token_id: "111",
          token_uri:
            "https://nftcalendar.io/storage/uploads/events/2025/3/oUfeUrSj3KcVnjColyfnS5ICYuqzDbiuqQP4qLIz.png",
        },
      ],
    },
  },
];
