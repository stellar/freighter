import { Asset } from "stellar-sdk";

import { HorizonOperation } from "@shared/api/types/types";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { mapHorizonOperations, synthesizeHorizonTransactions } from "../index";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getTokenDetails: jest.fn(async () => null),
}));

const PUBLIC_KEY = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
const COUNTERPARTY = "GCGORBD5DB4JDIKVIA536CJE3EWMWZ6KBUBWZWRQM7Y3NHFRCLOKYVAL";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const CREATED_AT = "2025-03-21T22:28:46Z";

const usdcContract = new Asset("USDC", USDC_ISSUER).contractId(
  TESTNET_NETWORK_DETAILS.networkPassphrase,
);

const balances = {
  balances: {
    usdc: {
      token: { code: "USDC", issuer: { key: USDC_ISSUER } },
      decimals: 7,
    },
  },
  isFunded: true,
  subentryCount: 0,
} as unknown as AccountBalances;

type HorizonOperationFixture = {
  type: string;
  id?: string;
  transaction_hash?: string;
  [key: string]: unknown;
};

const operation = (overrides: HorizonOperationFixture): HorizonOperation => {
  const id = overrides.id ?? "100000000001";
  const transactionHash = overrides.transaction_hash ?? "txhash";

  return {
    account: PUBLIC_KEY,
    created_at: CREATED_AT,
    id,
    paging_token: id,
    source_account: PUBLIC_KEY,
    transaction_hash: transactionHash,
    transaction_successful: true,
    transaction_attr: {
      fee_charged: "100",
      hash: transactionHash,
      ledger: 123,
      operation_count: 1,
    },
    type_i: 1,
    ...overrides,
  } as unknown as HorizonOperation;
};

const map = (operations: HorizonOperation[]) =>
  mapHorizonOperations({
    operations,
    publicKey: PUBLIC_KEY,
    networkDetails: TESTNET_NETWORK_DETAILS,
    balances,
    assetsListsData: [],
  });

describe("mapHorizonOperations", () => {
  it("groups multiple Horizon operations by transaction hash into one entry", async () => {
    const entries = await map([
      operation({
        id: "1",
        transaction_hash: "same",
        type: "payment",
        asset_type: "native",
        amount: "10.0000000",
        from: PUBLIC_KEY,
        to: COUNTERPARTY,
      }),
      operation({
        id: "2",
        transaction_hash: "same",
        type: "change_trust",
        asset_type: "credit_alphanum4",
        asset_code: "USDC",
        asset_issuer: USDC_ISSUER,
        limit: "1000.0000000",
      }),
    ]);

    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("same");
    expect(entries[0].details.operations).toHaveLength(2);
  });

  it("maps a sent payment to a debit balance change and patches the recipient", async () => {
    const [entry] = await map([
      operation({
        type: "payment",
        asset_type: "native",
        amount: "10.0000000",
        from: PUBLIC_KEY,
        to: COUNTERPARTY,
      }),
    ]);

    expect(entry.kind).toBe("sent");
    expect(entry.rowIcon.type).toBe("asset");
    expect(entry.primaryText).toBe("XLM");
    expect(entry.details.counterparty).toBe(COUNTERPARTY);
    expect(entry.details.balanceChanges).toEqual([
      expect.objectContaining({ amount: "10", direction: "debit" }),
    ]);
    expect(entry.amounts).toEqual([{ text: "-10 XLM", direction: "debit" }]);
  });

  it("maps a received payment to a credit balance change and patches the sender", async () => {
    const [entry] = await map([
      operation({
        type: "payment",
        asset_type: "credit_alphanum4",
        asset_code: "USDC",
        asset_issuer: USDC_ISSUER,
        amount: "5.2500000",
        from: COUNTERPARTY,
        to: PUBLIC_KEY,
      }),
    ]);

    expect(entry.kind).toBe("received");
    expect(entry.primaryText).toBe("USDC");
    expect(entry.details.counterparty).toBe(COUNTERPARTY);
    expect(entry.details.balanceChanges).toEqual([
      expect.objectContaining({ amount: "5.25", direction: "credit" }),
    ]);
    expect(entry.amounts).toEqual([
      { text: "+5.25 USDC", direction: "credit" },
    ]);
  });

  it("synthesizes create_account cards and starting-balance movement", async () => {
    const [entry] = await map([
      operation({
        type: "create_account",
        account: PUBLIC_KEY,
        funder: COUNTERPARTY,
        from: COUNTERPARTY,
        starting_balance: "2.0000000",
      }),
    ]);

    expect(entry.id).toBeTruthy();
    expect(entry.kind).toBe("received");
    expect(entry.rowIcon.type).toBe("asset");
    expect(entry.primaryText).toBe("XLM");
    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "accountCreated",
        address: PUBLIC_KEY,
        funder: COUNTERPARTY,
      },
    ]);
  });

  it("synthesizes an account_merge card", async () => {
    const [entry] = await map([
      operation({
        type: "account_merge",
        account: PUBLIC_KEY,
        from: PUBLIC_KEY,
        into: COUNTERPARTY,
      }),
    ]);

    expect(entry.kind).toBe("accountMerged");
    expect(entry.rowIcon).toEqual({ type: "account", variant: "merge" });
    expect(entry.primaryText).toBe("Account merged");
    expect(entry.details.stateChangeCards).toEqual([{ kind: "accountMerged" }]);
  });

  it("synthesizes a change_trust card with SAC token id", async () => {
    const [entry] = await map([
      operation({
        type: "change_trust",
        asset_type: "credit_alphanum4",
        asset_code: "USDC",
        asset_issuer: USDC_ISSUER,
        limit: "1000.0000000",
      }),
    ]);

    expect(entry.kind).toBe("trustlineAdded");
    expect(entry.primaryText).toBe("USDC");
    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "trustlines",
        verb: "created",
        entries: [
          {
            token: expect.objectContaining({
              code: "USDC",
              contractId: usdcContract,
            }),
            limitOld: null,
            limitNew: "1000.0000000",
          },
        ],
      },
    ]);
  });

  it("synthesizes a manage_data card", async () => {
    const [entry] = await map([
      operation({
        type: "manage_data",
        name: "hair_color",
        value: "Ymx1ZQ==",
      }),
    ]);

    expect(entry.kind).toBe("other");
    expect(entry.primaryText).toBe("Data entry");
    expect(entry.details.stateChangeCards).toEqual([
      {
        kind: "dataEntry",
        verb: "added",
        key: "hair_color",
        valueOldB64: null,
        valueNewB64: "Ymx1ZQ==",
      },
    ]);
  });

  it("synthesizes set_options signer, threshold, home-domain, and flag cards", async () => {
    const [entry] = await map([
      operation({
        type: "set_options",
        signer_key: COUNTERPARTY,
        signer_weight: 1,
        med_threshold: 2,
        home_domain: "stellar.org",
        set_flags: ["auth_required"],
        clear_flags: ["auth_revocable"],
      }),
    ]);

    expect(entry.id).toBe("txhash");
    expect(entry.kind).toBe("other");
    expect(entry.rowIcon).toEqual({ type: "settings", glyph: "threshold" });
    expect(entry.primaryText).toBe("Thresholds");
    expect(entry.details.stateChangeCards).toEqual([
      { kind: "thresholds", level: "medium", valueOld: null, valueNew: "2" },
      {
        kind: "homeDomain",
        verb: "set",
        domainOld: null,
        domainNew: "stellar.org",
      },
      {
        kind: "signers",
        verb: "added",
        entries: [{ address: COUNTERPARTY, weightOld: null, weightNew: 1 }],
      },
      {
        kind: "flags",
        set: ["auth_required"],
        cleared: ["auth_revocable"],
      },
    ]);
  });

  it("derives path-payment balance changes from asset_balance_changes", async () => {
    const [entry] = await map([
      operation({
        type: "path_payment_strict_receive",
        asset_balance_changes: [
          {
            asset_type: "credit_alphanum4",
            asset_code: "USDC",
            asset_issuer: USDC_ISSUER,
            from: PUBLIC_KEY,
            to: COUNTERPARTY,
            amount: "3.0000000",
          },
          {
            asset_type: "native",
            from: COUNTERPARTY,
            to: PUBLIC_KEY,
            amount: "10.0000000",
          },
        ],
      }),
    ]);

    expect(entry.kind).toBe("swapped");
    expect(entry.details.balanceChanges).toEqual([
      expect.objectContaining({ direction: "debit", amount: "3" }),
      expect.objectContaining({ direction: "credit", amount: "10" }),
    ]);
  });

  it("emits an entry for unknown operations with empty state changes", async () => {
    const transactions = synthesizeHorizonTransactions({
      operations: [
        operation({
          type: "bump_sequence",
        }),
      ],
      publicKey: PUBLIC_KEY,
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    expect(transactions).toEqual([
      expect.objectContaining({
        hash: "txhash",
        operations: [
          expect.objectContaining({ operation_type: "BUMP_SEQUENCE" }),
        ],
        state_changes: [],
      }),
    ]);

    const [entry] = await map([
      operation({
        type: "bump_sequence",
      }),
    ]);

    expect(entry.kind).toBe("other");
    expect(entry.primaryText).toBe("Transaction");
    expect(entry.details.operations).toHaveLength(1);
  });

  it("uses the network native SAC for XLM balance changes", () => {
    const [transaction] = synthesizeHorizonTransactions({
      operations: [
        operation({
          type: "payment",
          asset_type: "native",
          amount: "1.0000000",
          from: COUNTERPARTY,
          to: PUBLIC_KEY,
        }),
      ],
      publicKey: PUBLIC_KEY,
      networkDetails: TESTNET_NETWORK_DETAILS,
    });

    expect(transaction.state_changes).toEqual([
      expect.objectContaining({
        standard_balance_token_id: getNativeContractDetails(
          TESTNET_NETWORK_DETAILS,
        ).contract,
      }),
    ]);
  });
});
