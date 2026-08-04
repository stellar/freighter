/**
 * Horizon fallback adapter for the redesigned History UI.
 *
 * Backend-v1/custom-network history still arrives as Horizon operation rows.
 * This adapter groups those rows by transaction hash, synthesizes the v2
 * transaction/state-change wire shape, then reuses the v2 mapper so list-row
 * and detail presentation stay centralized.
 */

import BigNumber from "bignumber.js";
import { Asset } from "stellar-sdk";

import {
  V2AccountTransaction,
  V2Operation,
  V2OperationType,
  V2StateChange,
} from "@shared/api/types/backend-api";
import { AssetBalanceChange, HorizonOperation } from "@shared/api/types/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { isSameAccount } from "helpers/stellar";
import {
  buildTokenContext,
  TokenContext,
} from "popup/helpers/history/tokenResolver";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { CLASSIC_ASSET_DECIMALS } from "popup/helpers/soroban";
import { HistoryEntry } from "popup/views/AccountHistory/model";
import { collectTokenIds, mapV2Transaction } from "../v2";

export interface MapHorizonOperationsParams {
  operations: HorizonOperation[];
  publicKey: string;
  networkDetails: NetworkDetails;
  balances?: AccountBalances;
  assetsListsData?: AssetListResponse[];
}

interface HorizonTransactionAttrs {
  fee_charged?: string | number;
  hash?: string;
  ledger?: number | string;
  ledger_number?: number | string;
  successful?: boolean;
  transaction_successful?: boolean;
  result_code?: string;
}

type HorizonValue = string | number | null | undefined;

type HorizonOperationFields = HorizonOperation & {
  transaction_successful?: boolean;
  source_account?: string;
  funder?: string;
  into?: string;
  limit?: string;
  signer_key?: string;
  signer_weight?: HorizonValue;
  set_flags?: (string | number)[];
  clear_flags?: (string | number)[];
  low_threshold?: HorizonValue;
  med_threshold?: HorizonValue;
  high_threshold?: HorizonValue;
  home_domain?: string | null;
  name?: string;
  value?: string | null;
};

interface AssetLike {
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
}

interface SynthesizedStateChangeBase {
  ledger_number: number;
  ledger_created_at: string;
  ingested_at: string;
}

const HORIZON_OPERATION_TYPES: Partial<Record<string, V2OperationType>> = {
  account_merge: "ACCOUNT_MERGE",
  allow_trust: "ALLOW_TRUST",
  begin_sponsoring_future_reserves: "BEGIN_SPONSORING_FUTURE_RESERVES",
  bump_sequence: "BUMP_SEQUENCE",
  change_trust: "CHANGE_TRUST",
  claim_claimable_balance: "CLAIM_CLAIMABLE_BALANCE",
  clawback: "CLAWBACK",
  clawback_claimable_balance: "CLAWBACK_CLAIMABLE_BALANCE",
  create_account: "CREATE_ACCOUNT",
  create_claimable_balance: "CREATE_CLAIMABLE_BALANCE",
  create_passive_sell_offer: "CREATE_PASSIVE_SELL_OFFER",
  end_sponsoring_future_reserves: "END_SPONSORING_FUTURE_RESERVES",
  extend_footprint_ttl: "EXTEND_FOOTPRINT_TTL",
  inflation: "INFLATION",
  invoke_host_function: "INVOKE_HOST_FUNCTION",
  liquidity_pool_deposit: "LIQUIDITY_POOL_DEPOSIT",
  liquidity_pool_withdraw: "LIQUIDITY_POOL_WITHDRAW",
  manage_buy_offer: "MANAGE_BUY_OFFER",
  manage_data: "MANAGE_DATA",
  manage_sell_offer: "MANAGE_SELL_OFFER",
  path_payment_strict_receive: "PATH_PAYMENT_STRICT_RECEIVE",
  path_payment_strict_send: "PATH_PAYMENT_STRICT_SEND",
  payment: "PAYMENT",
  restore_footprint: "RESTORE_FOOTPRINT",
  revoke_sponsorship: "REVOKE_SPONSORSHIP",
  set_options: "SET_OPTIONS",
  set_trust_line_flags: "SET_TRUST_LINE_FLAGS",
};

const PAYMENT_OPERATION_TYPES = new Set([
  "payment",
  "path_payment_strict_receive",
  "path_payment_strict_send",
  "invoke_host_function",
]);

const decimalToSmallestUnit = (amount: string | number | undefined): string => {
  if (amount === undefined) {
    return "0";
  }

  return new BigNumber(amount)
    .abs()
    .shiftedBy(CLASSIC_ASSET_DECIMALS)
    .integerValue(BigNumber.ROUND_FLOOR)
    .toFixed(0);
};

const normalizeCreatedAt = (createdAt: string | number | undefined): string => {
  if (typeof createdAt === "number") {
    return new Date(createdAt).toISOString();
  }
  return createdAt || new Date(0).toISOString();
};

const txAttrs = (operation: HorizonOperationFields): HorizonTransactionAttrs =>
  (operation.transaction_attr ?? {}) as unknown as HorizonTransactionAttrs;

const ledgerNumber = (operation: HorizonOperationFields): number => {
  const attrs = txAttrs(operation);
  const raw = attrs.ledger_number ?? attrs.ledger ?? 0;
  return Number(raw) || 0;
};

const isTxSuccessful = (operation: HorizonOperationFields): boolean => {
  const attrs = txAttrs(operation);
  return (
    operation.transaction_successful ??
    attrs.transaction_successful ??
    attrs.successful ??
    true
  );
};

const stateBase = (
  operation: HorizonOperationFields,
): SynthesizedStateChangeBase => {
  const ledger_created_at = normalizeCreatedAt(operation.created_at);
  return {
    ledger_number: ledgerNumber(operation),
    ledger_created_at,
    ingested_at: ledger_created_at,
  };
};

const getNativeTokenId = (networkDetails: NetworkDetails) =>
  getNativeContractDetails(networkDetails).contract;

const assetTokenId = (
  asset: AssetLike,
  networkDetails: NetworkDetails,
): string | null => {
  if (asset.asset_type === "native" || asset.asset_code === "XLM") {
    return getNativeTokenId(networkDetails);
  }

  if (!asset.asset_code || !asset.asset_issuer) {
    return null;
  }

  try {
    return new Asset(asset.asset_code, asset.asset_issuer).contractId(
      networkDetails.networkPassphrase,
    );
  } catch {
    return null;
  }
};

const standardBalanceChange = ({
  operation,
  tokenId,
  amount,
  reason,
}: {
  operation: HorizonOperationFields;
  tokenId: string;
  amount: string | number | undefined;
  reason: "DEBIT" | "CREDIT";
}): V2StateChange => ({
  ...stateBase(operation),
  variant: "BalanceChange",
  type: "BALANCE",
  reason,
  token_id: tokenId,
  amount: decimalToSmallestUnit(amount),
});

const balanceChangeFromAssetDiff = (
  operation: HorizonOperationFields,
  change: AssetBalanceChange,
  publicKey: string,
  networkDetails: NetworkDetails,
): V2StateChange | null => {
  if (
    !isSameAccount(change.from, publicKey) &&
    !isSameAccount(change.to, publicKey)
  ) {
    return null;
  }

  const tokenId = assetTokenId(change, networkDetails);
  if (tokenId === null) {
    return null;
  }

  return standardBalanceChange({
    operation,
    tokenId,
    amount: change.amount,
    reason: isSameAccount(change.to, publicKey) ? "CREDIT" : "DEBIT",
  });
};

const paymentStateChanges = (
  operation: HorizonOperationFields,
  publicKey: string,
  networkDetails: NetworkDetails,
): V2StateChange[] => {
  if (
    operation.asset_balance_changes &&
    PAYMENT_OPERATION_TYPES.has(operation.type)
  ) {
    return operation.asset_balance_changes
      .map((change) =>
        balanceChangeFromAssetDiff(
          operation,
          change,
          publicKey,
          networkDetails,
        ),
      )
      .filter((change): change is V2StateChange => change !== null);
  }

  const tokenId = assetTokenId(operation, networkDetails);
  if (tokenId === null) {
    return [];
  }

  return [
    standardBalanceChange({
      operation,
      tokenId,
      amount: operation.amount,
      reason: isSameAccount(operation.from, publicKey) ? "DEBIT" : "CREDIT",
    }),
  ];
};

const createAccountStateChanges = (
  operation: HorizonOperationFields,
  publicKey: string,
  networkDetails: NetworkDetails,
): V2StateChange[] => {
  const changes: V2StateChange[] = [
    {
      ...stateBase(operation),
      variant: "AccountCreatedChange",
      type: "ACCOUNT",
      reason: "CREATE",
      creator_address: operation.funder ?? operation.from ?? "",
    },
  ];

  const createdAccount = operation.account;
  const funder = operation.funder ?? operation.from;
  const amount = operation.starting_balance;
  const xlmTokenId = getNativeTokenId(networkDetails);

  if (!amount) {
    return changes;
  }

  if (isSameAccount(createdAccount, publicKey)) {
    changes.push(
      standardBalanceChange({
        operation,
        tokenId: xlmTokenId,
        amount,
        reason: "CREDIT",
      }),
    );
  } else if (isSameAccount(funder, publicKey)) {
    changes.push(
      standardBalanceChange({
        operation,
        tokenId: xlmTokenId,
        amount,
        reason: "DEBIT",
      }),
    );
  }

  return changes;
};

const accountMergeStateChanges = (
  operation: HorizonOperationFields,
): V2StateChange[] => [
  {
    ...stateBase(operation),
    variant: "AccountMergedChange",
    type: "ACCOUNT",
    reason: "MERGE",
    destination_address: operation.into ?? "",
  },
];

const changeTrustStateChanges = (
  operation: HorizonOperationFields,
  networkDetails: NetworkDetails,
): V2StateChange[] => {
  const tokenId = assetTokenId(operation, networkDetails);
  const limit = operation.limit ?? "0";

  // Horizon exposes only the resulting limit, so a zero limit reads as a
  // removal and anything else as an add; updates are indistinguishable here.
  if (new BigNumber(limit).isZero()) {
    return [
      {
        ...stateBase(operation),
        variant: "TrustlineRemovedChange",
        type: "TRUSTLINE",
        reason: "REMOVE",
        token_id: tokenId ?? undefined,
      },
    ];
  }

  return [
    {
      ...stateBase(operation),
      variant: "TrustlineAddedChange",
      type: "TRUSTLINE",
      reason: "ADD",
      token_id: tokenId ?? undefined,
      limit,
    },
  ];
};

const flagsStateChanges = (
  operation: HorizonOperationFields,
): V2StateChange[] => {
  const changes: V2StateChange[] = [];

  if (operation.set_flags?.length) {
    changes.push({
      ...stateBase(operation),
      variant: "AccountFlagsChange",
      type: "FLAGS",
      reason: "SET",
      flags: operation.set_flags.map(String),
    });
  }

  if (operation.clear_flags?.length) {
    changes.push({
      ...stateBase(operation),
      variant: "AccountFlagsChange",
      type: "FLAGS",
      reason: "CLEAR",
      flags: operation.clear_flags.map(String),
    });
  }

  return changes;
};

const signerStateChanges = (
  operation: HorizonOperationFields,
): V2StateChange[] => {
  if (!operation.signer_key || operation.signer_weight === undefined) {
    return [];
  }

  const weight = Number(operation.signer_weight);

  // Horizon reports only the resulting weight: 0 means the signer was removed,
  // and the prior weight is unknown either way.
  if (weight === 0) {
    return [
      {
        ...stateBase(operation),
        variant: "SignerRemovedChange",
        type: "SIGNER",
        reason: "REMOVE",
        signer_address: operation.signer_key,
      },
    ];
  }

  return [
    {
      ...stateBase(operation),
      variant: "SignerAddedChange",
      type: "SIGNER",
      reason: "ADD",
      signer_address: operation.signer_key,
      new_weight: weight,
    },
  ];
};

const thresholdStateChanges = (
  operation: HorizonOperationFields,
): V2StateChange[] => {
  const thresholdFields = [
    ["LOW", operation.low_threshold],
    ["MEDIUM", operation.med_threshold],
    ["HIGH", operation.high_threshold],
  ] as const;

  // Horizon carries no prior threshold, so old_threshold is left unset.
  return thresholdFields
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([threshold, value]) => ({
      ...stateBase(operation),
      variant: "ThresholdChange" as const,
      type: "SIGNATURE_THRESHOLD" as const,
      reason: "UPDATE" as const,
      threshold,
      new_threshold: Number(value),
    }));
};

const homeDomainStateChange = (
  operation: HorizonOperationFields,
): V2StateChange[] => {
  if (operation.home_domain === undefined || operation.home_domain === null) {
    return [];
  }

  return [
    {
      ...stateBase(operation),
      variant: "HomeDomainSetChange",
      type: "HOME_DOMAIN",
      reason: "SET",
      home_domain: operation.home_domain,
    },
  ];
};

const setOptionsStateChanges = (
  operation: HorizonOperationFields,
): V2StateChange[] => [
  ...signerStateChanges(operation),
  ...flagsStateChanges(operation),
  ...thresholdStateChanges(operation),
  ...homeDomainStateChange(operation),
];

const manageDataStateChanges = (
  operation: HorizonOperationFields,
): V2StateChange[] => {
  if (!operation.name) {
    return [];
  }

  return [
    {
      ...stateBase(operation),
      variant: "DataEntryAddedChange",
      type: "DATA_ENTRY",
      reason: "ADD",
      name: operation.name,
      value: operation.value ?? "",
    },
  ];
};

const stateChangesForOperation = (
  operation: HorizonOperationFields,
  publicKey: string,
  networkDetails: NetworkDetails,
): V2StateChange[] => {
  switch (operation.type) {
    case "payment":
      return paymentStateChanges(operation, publicKey, networkDetails);
    case "path_payment_strict_receive":
    case "path_payment_strict_send":
    case "invoke_host_function":
      return paymentStateChanges(operation, publicKey, networkDetails);
    case "create_account":
      return createAccountStateChanges(operation, publicKey, networkDetails);
    case "account_merge":
      return accountMergeStateChanges(operation);
    case "change_trust":
      return changeTrustStateChanges(operation, networkDetails);
    case "set_options":
      return setOptionsStateChanges(operation);
    case "manage_data":
      return manageDataStateChanges(operation);
    default:
      return [];
  }
};

const toV2OperationType = (type: string): V2OperationType =>
  HORIZON_OPERATION_TYPES[type] ?? (type.toUpperCase() as V2OperationType);

const toV2Operation = (operation: HorizonOperationFields): V2Operation => {
  const successful = isTxSuccessful(operation);
  const ledger_created_at = normalizeCreatedAt(operation.created_at);

  return {
    id: String(operation.id),
    operation_type: toV2OperationType(operation.type),
    operation_xdr: "",
    result_code: successful ? "op_success" : "op_failed",
    successful,
    ledger_number: ledgerNumber(operation),
    ledger_created_at,
    ingested_at: ledger_created_at,
  };
};

const transactionHash = (operation: HorizonOperationFields): string => {
  const attrs = txAttrs(operation);
  return operation.transaction_hash || attrs.hash || String(operation.id);
};

const groupByTransactionHash = (
  operations: HorizonOperation[],
): HorizonOperationFields[][] => {
  const grouped = new Map<string, HorizonOperationFields[]>();

  operations.forEach((operation) => {
    const typedOperation = operation as HorizonOperationFields;
    const hash = transactionHash(typedOperation);
    grouped.set(hash, [...(grouped.get(hash) ?? []), typedOperation]);
  });

  return [...grouped.values()];
};

const synthesizeTransaction = (
  operations: HorizonOperationFields[],
  publicKey: string,
  networkDetails: NetworkDetails,
): V2AccountTransaction => {
  const [first] = operations;
  const attrs = txAttrs(first);
  const successful = isTxSuccessful(first);
  const ledger_created_at = normalizeCreatedAt(first.created_at);

  return {
    hash: transactionHash(first),
    fee_charged: String(attrs.fee_charged ?? "0"),
    result_code: successful
      ? (attrs.result_code ?? "tx_success")
      : (attrs.result_code ?? "tx_failed"),
    ledger_number: ledgerNumber(first),
    ledger_created_at,
    is_fee_bump: false,
    ingested_at: ledger_created_at,
    operations: operations.map(toV2Operation),
    state_changes: operations.flatMap((operation) =>
      stateChangesForOperation(operation, publicKey, networkDetails),
    ),
  };
};

const counterpartyFromAssetDiff = (
  operation: HorizonOperationFields,
  publicKey: string,
): string | null =>
  operation.asset_balance_changes
    ?.map((change) => {
      if (isSameAccount(change.from, publicKey)) {
        return change.to;
      }
      if (isSameAccount(change.to, publicKey)) {
        return change.from;
      }
      return null;
    })
    .find((counterparty) => counterparty !== null) ?? null;

const counterpartyFromOperation = (
  operation: HorizonOperationFields,
  publicKey: string,
): string | null => {
  const from = operation.from ?? operation.funder ?? operation.source_account;
  const to = operation.to ?? operation.into ?? operation.account;

  if (isSameAccount(from, publicKey)) {
    return to ?? null;
  }
  if (isSameAccount(to, publicKey)) {
    return from ?? null;
  }

  return counterpartyFromAssetDiff(operation, publicKey);
};

const patchCounterparty = (
  entry: HistoryEntry,
  operations: HorizonOperationFields[],
  publicKey: string,
): HistoryEntry => {
  const counterparty =
    operations
      .map((operation) => counterpartyFromOperation(operation, publicKey))
      .find((address) => address !== null) ?? entry.details.counterparty;

  return {
    ...entry,
    details: {
      ...entry.details,
      counterparty,
    },
  };
};

const synthesizeHorizonTransactionsWithGroups = ({
  operations,
  publicKey,
  networkDetails,
}: Pick<
  MapHorizonOperationsParams,
  "operations" | "publicKey" | "networkDetails"
>): {
  transactions: V2AccountTransaction[];
  groups: HorizonOperationFields[][];
} => {
  const groups = groupByTransactionHash(operations);
  return {
    groups,
    transactions: groups.map((group) =>
      synthesizeTransaction(group, publicKey, networkDetails),
    ),
  };
};

export const synthesizeHorizonTransactions = (
  params: Pick<
    MapHorizonOperationsParams,
    "operations" | "publicKey" | "networkDetails"
  >,
): V2AccountTransaction[] =>
  synthesizeHorizonTransactionsWithGroups(params).transactions;

export const mapHorizonOperations = async ({
  operations,
  publicKey,
  networkDetails,
  balances,
  assetsListsData = [],
}: MapHorizonOperationsParams): Promise<HistoryEntry[]> => {
  const { transactions, groups } = synthesizeHorizonTransactionsWithGroups({
    operations,
    publicKey,
    networkDetails,
  });
  const tokens: TokenContext = await buildTokenContext({
    tokenIds: collectTokenIds(transactions),
    networkDetails,
    balances,
    assetsListsData,
  });
  const nativeTokenId = getNativeTokenId(networkDetails);

  return transactions.map((transaction, index) =>
    patchCounterparty(
      mapV2Transaction(transaction, {
        tokens,
        publicKey,
        nativeTokenId,
      }),
      groups[index],
      publicKey,
    ),
  );
};
