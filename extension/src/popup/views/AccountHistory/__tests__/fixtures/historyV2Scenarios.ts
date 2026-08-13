/**
 * Hand-built account-history transactions, one per scenario in the Figma
 * "History details" design (file KwkHXQxbNmDllwermJtnRu, section 11870:39557).
 *
 * TEST-ONLY — it lives under `__tests__/fixtures/` (jest treats that directory
 * as importable data, not as suites) precisely so application code cannot reach
 * for it: the app has no fixture path, `getAccountHistoryV2` always calls the
 * backend. These transactions are the inputs the v2 history suites map, filter
 * and render, and between them they cover every row treatment the design
 * defines: swaps, payments, trustlines,
 * signer, threshold, data-entry, home-domain, flag, balance-authorization,
 * allowance, account-created/merged, protocol actions and failed transactions.
 *
 * Shapes mirror the account-history types in `@shared/api/types/backend-api.ts`
 * (see that block for verified field encodings).
 *
 * All `operation_xdr` values are REAL base64-encoded xdr.Operation structures
 * generated with @stellar/stellar-sdk, so XDR-decoding code paths (advanced
 * "Transaction details" sheet, invoke parameters) work against these mocks.
 */

import {
  V2AccountTransaction,
  V2Operation,
  V2OperationType,
  V2StateChange,
} from "@shared/api/types/backend-api";

/* ── Test actors ─────────────────────────────────────────────────────────── */

/** The account whose history is being viewed */
export const MOCK_SELF =
  "GCFIRY65OQE7DFP5KLNS2PF2LVZMUZYJX4OZIEQ36N2IQANUB5XVYOJR";
/** An external counterparty (unknown to the wallet) */
export const MOCK_EXTERNAL =
  "GCATS5YOVB6ROX2WUNKGNQ2MP3GMXDMKSG2O4N5CLX3A6W4PZGZZI55U";
/** A second wallet account ("Account 2" in the wallet) */
export const MOCK_ACCOUNT_2 =
  "GDWUSKGGFDI4FRXK5EBTRECZSVQSSWJHHJOGH6JWG3AUMFFMQ435DIAG";
export const MOCK_USDC_ISSUER =
  "GDFJHLAXAUMHA4OWPOB4P7YO72AQR2HMIUYFOXLXE2DZGM633K7HZDQP";

/** Real pubnet SAC contract addresses for native + classic assets */
export const MOCK_XLM_SAC =
  "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
export const MOCK_USDC_SAC =
  "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";
export const MOCK_EURC_SAC =
  "CAEQSCIJBEEQSCIJBEEQSCIJBEEQSCIJBEEQSCIJBEEQSCIJBEEQTD2L";
/** BLND — GDJEHTBE6ZHUXSWFI642DCGLUOECLHPF3KSXHPXTSTJ7E3JF6MQ5EZYY */
export const MOCK_BLND_SAC =
  "CD25MNVTZDL4Y3XBCPCJXGXATV5WUHHOWMYFF4YBEGU5FCPGMYTVG5JY";
/** An unknown protocol's router contract (no /protocols match → fallback row) */
export const MOCK_ROUTER_CONTRACT =
  "CADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP5KR";
/** A Blend v2 pool contract (YieldBlox on pubnet) — the emissions claim's `pool_id` */
export const MOCK_BLEND_POOL =
  "CCCCIQSDILITHMM7PBSLVDT5MISSY7R26MNZXCX4H7J5JQ5FPIYOGYFS";

/* ── Real xdr.Operation base64 blobs (generated with @stellar/stellar-sdk) ── */

const OP_XDR = {
  paymentSentXlm:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAEAAAAA7UkoxijRwsbq6QM4kFmVYSlZJzpcY/k2NsFGFKyHN9EAAAAAAAAAADuaygA=",
  paymentReceivedUsdc:
    "AAAAAQAAAADtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QAAAAEAAAAAiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1wAAAABVVNEQwAAAADKk6wXBRhwcdZ7g8f/Dv6BCOjsRTBXXXcmh5Mz29q+fAAAAAAYFI0A",
  pathPaymentSwap:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAA0AAAAAAAAAABfXhAAAAAAAiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1wAAAABVVNEQwAAAADKk6wXBRhwcdZ7g8f/Dv6BCOjsRTBXXXcmh5Mz29q+fAAAAAAX6lqHAAAAAQAAAAFFVVJDAAAAAG56HN0psLeP0Tr0xVmP7/TvKpcWbjym8uT7/M2AUFvx",
  createAccount:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAAAAAAA7UkoxijRwsbq6QM4kFmVYSlZJzpcY/k2NsFGFKyHN9EAAAAAAvrwgA==",
  accountMerge:
    "AAAAAQAAAADtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QAAAAgAAAAAiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1w=",
  changeTrustAdd:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAYAAAABVVNEQwAAAADKk6wXBRhwcdZ7g8f/Dv6BCOjsRTBXXXcmh5Mz29q+fH//////////",
  changeTrustUpdate:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAYAAAABeVhMTQAAAADtSSjGKNHCxurpAziQWZVhKVknOlxj+TY2wUYUrIc30QAAABdIdugA",
  changeTrustRemove:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAYAAAABQVJTVAAAAABuehzdKbC3j9E69MVZj+/07yqXFm48pvLk+/zNgFBb8QAAAAAAAAAA",
  setOptionsSigner:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAA7UkoxijRwsbq6QM4kFmVYSlZJzpcY/k2NsFGFKyHN9EAAAAB",
  setOptionsThresholds:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAABAAAAAwAAAAEAAAADAAAAAAAAAAA=",
  setOptionsFlags:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAUAAAAAAAAAAQAAAAgAAAABAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
  setOptionsHomeDomain:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAtzdGVsbGFyLmNvbQAAAAAA",
  manageDataAdd:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAoAAAAKaGFpcl9jb2xvcgAAAAAAAQAAACAAAQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHw==",
  manageDataRemove:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAoAAAAKaGFpcl9jb2xvcgAAAAAAAA==",
  setTrustLineFlags:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAABUAAAAA7UkoxijRwsbq6QM4kFmVYSlZJzpcY/k2NsFGFKyHN9EAAAABVVNEQwAAAADKk6wXBRhwcdZ7g8f/Dv6BCOjsRTBXXXcmh5Mz29q+fAAAAAAAAAAB",
  beginSponsoringFutureReserves:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAABAAAAAA7UkoxijRwsbq6QM4kFmVYSlZJzpcY/k2NsFGFKyHN9E=",
  /** router.swap(self, 400000000 i128, 293807090 i128, [XLM_SAC, USDC_SAC], deadline u64) */
  invokeHostFnSwap:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAABgAAAAAAAAAAQcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHBwcHAAAABHN3YXAAAAAFAAAAEgAAAAAAAAAAiojj3XQJ8ZX9UtstPLpdcspnCb8dlBIb83SIAbQPb1wAAAAKAAAAAAAAAAAAAAAAF9eEAAAAAAoAAAAAAAAAAAAAAAARgyPyAAAAEAAAAAEAAAACAAAAEgAAAAEltPzYWa7C+mNIQ4xImzw8EMmLbSG+T9PLMMtolT75dwAAABIAAAABre/OWa7lKWj3YGHUlMJSW3Vln6QpamX0me8p5WR35JYAAAAFbO4FfQAAAZUAAAAA",
  /** blendPool.claim(self, [0, 1] vec<u32>, self) */
  invokeHostFnBlendClaim:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAABgAAAAAAAAAAYQkQkNC0TOxn3hkuo59YiUsfjrzG5uK/D/T1MOlejDjAAAABWNsYWltAAAAAAAAAwAAABIAAAAAAAAAAIqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAEAAAAAEAAAACAAAAAwAAAAAAAAADAAAAAQAAABIAAAAAAAAAAIqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAAA==",
  /** external creates a 100 XLM claimable balance with self as the only claimant */
  createClaimableBalance:
    "AAAAAQAAAACBOXcOqH0XX1ajVGbDTH7My42KkbTuN6Jd9g9bj8mzlAAAAA4AAAAAAAAAADuaygAAAAABAAAAAAAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAAAA=",
  /** usdcSac.transfer(self, account2, 404000000 i128) */
  invokeHostFnTransfer:
    "AAAAAQAAAACKiOPddAnxlf1S2y08ul1yymcJvx2UEhvzdIgBtA9vXAAAABgAAAAAAAAAAa3vzlmu5Slo92Bh1JTCUlt1ZZ+kKWpl9JnvKeVkd+SWAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAIqI4910CfGV/VLbLTy6XXLKZwm/HZQSG/N0iAG0D29cAAAAEgAAAAAAAAAA7UkoxijRwsbq6QM4kFmVYSlZJzpcY/k2NsFGFKyHN9EAAAAKAAAAAAAAAAAAAAAAGBSNAAAAAAA=",
};

/* ── Builders ────────────────────────────────────────────────────────────── */

/**
 * TOID = ledger << 32 | txOrder << 12 | opIndex, computed with BigInt and
 * emitted as a decimal string — matching the backend, which string-encodes
 * int64 ids so pubnet-scale TOIDs (> 2^53-1) survive JSON parsing.
 */
const toid = (ledger: number, txOrder: number, opIndex = 0) =>
  (
    BigInt(ledger) * BigInt(4294967296) + // << 32
    BigInt(txOrder) * BigInt(4096) + // << 12
    BigInt(opIndex)
  ).toString();

const FEE_STROOPS = "51234"; // 0.0051234 XLM, as shown in the Figma meta card

let hashCounter = 0;
const txHash = () => {
  hashCounter += 1;
  return hashCounter.toString(16).padStart(8, "0").repeat(8);
};

interface TxSpec {
  ledger: number;
  txOrder: number;
  createdAt: string;
  /** XDR enum name, e.g. "TransactionResultCodeTxFailed"; defaults to success */
  resultCode?: string;
  operations: {
    operationType: V2OperationType;
    operationXdr: string;
    successful?: boolean;
  }[];
  /** state changes minus the boilerplate base fields */
  stateChanges: (Partial<V2StateChange> & {
    type: V2StateChange["type"];
    reason: V2StateChange["reason"];
  })[];
  /** set false to skip the implicit fee state change (e.g. fee paid by other account) */
  selfPaidFee?: boolean;
}

const buildTransaction = (spec: TxSpec): V2AccountTransaction => {
  const failed =
    spec.resultCode !== undefined && !spec.resultCode.endsWith("Success");
  const operations: V2Operation[] = spec.operations.map((op, i) => ({
    id: toid(spec.ledger, spec.txOrder, i),
    operation_type: op.operationType,
    operation_xdr: op.operationXdr,
    result_code: failed ? "op_failed" : "op_success",
    successful: op.successful ?? !failed,
    ledger_number: spec.ledger,
    ledger_created_at: spec.createdAt,
    ingested_at: spec.createdAt,
  }));

  const base = {
    ledger_number: spec.ledger,
    ledger_created_at: spec.createdAt,
    ingested_at: spec.createdAt,
  };

  const stateChanges = spec.stateChanges.map(
    (change) => ({ ...base, ...change }) as V2StateChange,
  );

  if (spec.selfPaidFee !== false) {
    stateChanges.push({
      variant: "BalanceChange",
      type: "BALANCE",
      reason: "DEBIT",
      token_id: MOCK_XLM_SAC,
      amount: FEE_STROOPS,
      ...base,
    });
  }

  return {
    hash: txHash(),
    fee_charged: FEE_STROOPS,
    result_code: spec.resultCode ?? "TransactionResultCodeTxSuccess",
    ledger_number: spec.ledger,
    ledger_created_at: spec.createdAt,
    is_fee_bump: false,
    ingested_at: spec.createdAt,
    operations,
    state_changes: stateChanges,
  };
};

const balance = (
  reason: "DEBIT" | "CREDIT" | "MINT" | "BURN",
  tokenId: string,
  amount: string,
) =>
  ({
    variant: "BalanceChange",
    type: "BALANCE",
    reason,
    token_id: tokenId,
    amount,
  }) as const;

/* ── Scenario fixtures (one per Figma frame) ─────────────────────────────── */

/** Figma 12045:41629 "Balance change _Swapped" + list row "XLM to USDC / Swapped / +40.40 USDC" */
export const mockSwapClassicDex = buildTransaction({
  ledger: 52_100_040,
  txOrder: 12,
  createdAt: "2024-05-27T14:33:00Z",
  operations: [
    {
      operationType: "PATH_PAYMENT_STRICT_SEND",
      operationXdr: OP_XDR.pathPaymentSwap,
    },
  ],
  stateChanges: [
    balance("DEBIT", MOCK_XLM_SAC, "400000000"), // -40.00 XLM
    balance("CREDIT", MOCK_USDC_SAC, "404000000"), // +40.40 USDC
  ],
});

/** Figma 12116:49031 "Balance change _Swapped(contract)": unknown-protocol swap, token treatment */
export const mockSwapViaContract = buildTransaction({
  ledger: 52_099_500,
  txOrder: 3,
  createdAt: "2024-05-26T18:05:00Z",
  operations: [
    {
      operationType: "INVOKE_HOST_FUNCTION",
      operationXdr: OP_XDR.invokeHostFnSwap,
    },
  ],
  stateChanges: [
    balance("DEBIT", MOCK_XLM_SAC, "400000000"),
    balance("CREDIT", MOCK_USDC_SAC, "404000000"),
  ],
});

/** Figma list row "Contract / domain.com / Multiple" + 12001:19568 "Max width" detail */
export const mockContractMultiAsset = buildTransaction({
  ledger: 52_099_100,
  txOrder: 7,
  createdAt: "2024-05-26T12:00:00Z",
  operations: [
    {
      operationType: "INVOKE_HOST_FUNCTION",
      operationXdr: OP_XDR.invokeHostFnSwap,
    },
  ],
  stateChanges: [
    balance("DEBIT", MOCK_XLM_SAC, "1000000000"), // -100.00 XLM
    balance("DEBIT", MOCK_EURC_SAC, "1000000000"), // -100.00 EURC
    balance("DEBIT", MOCK_EURC_SAC, "1000000000"),
    balance("CREDIT", MOCK_USDC_SAC, "404000000"), // +40.40 USDC
    balance("CREDIT", MOCK_USDC_SAC, "404000000"),
    balance("CREDIT", MOCK_USDC_SAC, "404000000"),
  ],
});

/** Figma 12116:49168 "No token change balance": contract call, fee-only state change */
export const mockContractNoBalanceChange = buildTransaction({
  ledger: 52_098_800,
  txOrder: 22,
  createdAt: "2024-05-26T09:15:00Z",
  operations: [
    {
      operationType: "INVOKE_HOST_FUNCTION",
      operationXdr: OP_XDR.invokeHostFnTransfer,
    },
  ],
  stateChanges: [],
});

/** Figma 12116:48964 "Balance change _Received": from another of the wallet's accounts */
export const mockPaymentReceived = buildTransaction({
  ledger: 51_600_000,
  txOrder: 5,
  createdAt: "2024-04-20T10:12:00Z",
  operations: [
    { operationType: "PAYMENT", operationXdr: OP_XDR.paymentReceivedUsdc },
  ],
  stateChanges: [balance("CREDIT", MOCK_USDC_SAC, "404000000")],
  selfPaidFee: false, // sender paid the fee
});

/** Soroban SEP-41 transfer out */
export const mockTokenTransferSent = buildTransaction({
  ledger: 51_550_000,
  txOrder: 9,
  createdAt: "2024-04-19T16:40:00Z",
  operations: [
    {
      operationType: "INVOKE_HOST_FUNCTION",
      operationXdr: OP_XDR.invokeHostFnTransfer,
    },
  ],
  stateChanges: [balance("DEBIT", MOCK_USDC_SAC, "404000000")],
});

/** Figma 12116:48163 "Trustline change" / list row "USDC / Added trustline" */
export const mockTrustlineAdded = buildTransaction({
  ledger: 51_540_000,
  txOrder: 2,
  createdAt: "2024-04-19T09:00:00Z",
  operations: [
    { operationType: "CHANGE_TRUST", operationXdr: OP_XDR.changeTrustAdd },
  ],
  stateChanges: [
    {
      variant: "TrustlineAddedChange",
      type: "TRUSTLINE",
      reason: "ADD",
      token_id: MOCK_USDC_SAC,
      limit: "922337203685.4775807",
    },
  ],
});

/** Figma 12132:61320 "Multiple trustline change": create + update (limit) + remove in one tx */
export const mockTrustlineMulti = buildTransaction({
  ledger: 51_530_000,
  txOrder: 4,
  createdAt: "2024-04-18T13:30:00Z",
  operations: [
    { operationType: "CHANGE_TRUST", operationXdr: OP_XDR.changeTrustAdd },
    { operationType: "CHANGE_TRUST", operationXdr: OP_XDR.changeTrustUpdate },
    { operationType: "CHANGE_TRUST", operationXdr: OP_XDR.changeTrustRemove },
  ],
  stateChanges: [
    {
      variant: "TrustlineAddedChange",
      type: "TRUSTLINE",
      reason: "ADD",
      token_id: MOCK_USDC_SAC,
      limit: "922337203685.4775807",
    },
    {
      variant: "TrustlineUpdatedChange",
      type: "TRUSTLINE",
      reason: "UPDATE",
      token_id: MOCK_EURC_SAC,
      old_limit: "1000.0000000",
      new_limit: "10000.0000000",
    },
    {
      variant: "TrustlineRemovedChange",
      type: "TRUSTLINE",
      reason: "REMOVE",
      token_id: MOCK_EURC_SAC,
    },
  ],
});

/** Figma 12045:42057 "Account" + 12116:47847 "Account created": this account was funded */
export const mockAccountCreated = buildTransaction({
  ledger: 51_520_000,
  txOrder: 1,
  createdAt: "2024-04-18T08:00:00Z",
  operations: [
    { operationType: "CREATE_ACCOUNT", operationXdr: OP_XDR.createAccount },
  ],
  stateChanges: [
    {
      variant: "AccountCreatedChange",
      type: "ACCOUNT",
      reason: "CREATE",
      creator_address: MOCK_EXTERNAL,
    },
    balance("CREDIT", MOCK_XLM_SAC, "50000000"), // +5.00 XLM starting balance
  ],
  selfPaidFee: false,
});

/** Figma 12045:42318 "Account merged" (merged balance received by this account) */
export const mockAccountMerged = buildTransaction({
  ledger: 51_510_000,
  txOrder: 6,
  createdAt: "2024-04-17T19:45:00Z",
  operations: [
    { operationType: "ACCOUNT_MERGE", operationXdr: OP_XDR.accountMerge },
  ],
  stateChanges: [
    {
      variant: "AccountMergedChange",
      type: "ACCOUNT",
      reason: "MERGE",
      destination_address: MOCK_EXTERNAL,
    },
    balance("CREDIT", MOCK_XLM_SAC, "1234500000"), // merged balance received
  ],
  selfPaidFee: false,
});

/** Figma 12045:41260 "Signer change": single signer added */
export const mockSignerAdded = buildTransaction({
  ledger: 51_500_000,
  txOrder: 11,
  createdAt: "2024-04-17T11:20:00Z",
  operations: [
    { operationType: "SET_OPTIONS", operationXdr: OP_XDR.setOptionsSigner },
  ],
  stateChanges: [
    {
      variant: "SignerAddedChange",
      type: "SIGNER",
      reason: "ADD",
      signer_address: MOCK_ACCOUNT_2,
      new_weight: 1,
    },
  ],
});

/** Figma 12132:60571 "Multiple signer change (edge case)": add/update/remove in one tx */
export const mockSignerMulti = buildTransaction({
  ledger: 51_490_000,
  txOrder: 8,
  createdAt: "2024-04-16T15:10:00Z",
  operations: [
    { operationType: "SET_OPTIONS", operationXdr: OP_XDR.setOptionsSigner },
    { operationType: "SET_OPTIONS", operationXdr: OP_XDR.setOptionsSigner },
    { operationType: "SET_OPTIONS", operationXdr: OP_XDR.setOptionsSigner },
  ],
  stateChanges: [
    {
      variant: "SignerAddedChange",
      type: "SIGNER",
      reason: "ADD",
      signer_address: MOCK_ACCOUNT_2,
      new_weight: 1,
    },
    {
      variant: "SignerUpdatedChange",
      type: "SIGNER",
      reason: "UPDATE",
      signer_address: MOCK_EXTERNAL,
      old_weight: 1,
      new_weight: 2,
    },
    {
      variant: "SignerRemovedChange",
      type: "SIGNER",
      reason: "REMOVE",
      signer_address: MOCK_USDC_ISSUER,
      old_weight: 1,
    },
    balance("DEBIT", MOCK_XLM_SAC, "400000000"),
  ],
});

/** Figma 12116:47862 "Signer Thresholds change": "Medium 2 → 3" */
export const mockThresholdsChange = buildTransaction({
  ledger: 51_480_000,
  txOrder: 14,
  createdAt: "2024-04-15T20:30:00Z",
  operations: [
    {
      operationType: "SET_OPTIONS",
      operationXdr: OP_XDR.setOptionsThresholds,
    },
  ],
  stateChanges: [
    {
      variant: "ThresholdChange",
      type: "SIGNATURE_THRESHOLD",
      reason: "UPDATE",
      threshold: "MEDIUM",
      old_threshold: 2,
      new_threshold: 3,
    },
  ],
});

/**
 * Figma 12045:42334 "Metadata" + 12150:63302 data-entry sub-sheet
 * ("hair_color"). Like 12132:62391, the board heads this tx
 * "Contract / domain.com" — a contract invocation that wrote one data entry.
 */
export const mockDataEntryAdded = buildTransaction({
  ledger: 51_470_000,
  txOrder: 17,
  createdAt: "2024-04-15T08:25:00Z",
  operations: [
    {
      operationType: "INVOKE_HOST_FUNCTION",
      operationXdr: OP_XDR.invokeHostFnTransfer,
    },
  ],
  stateChanges: [
    {
      variant: "DataEntryAddedChange",
      type: "DATA_ENTRY",
      reason: "ADD",
      name: "hair_color",
      value: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
    },
  ],
});

/**
 * Figma 12132:62391 "Metadata_Multiple entries": add + update + remove in one
 * tx. A contract invocation, matching the board's "Contract / domain.com"
 * header — data-entry changes usually accompany one.
 */
export const mockDataEntryMulti = buildTransaction({
  ledger: 51_460_000,
  txOrder: 19,
  createdAt: "2024-04-14T17:55:00Z",
  operations: [
    {
      operationType: "INVOKE_HOST_FUNCTION",
      operationXdr: OP_XDR.invokeHostFnTransfer,
    },
  ],
  stateChanges: [
    {
      variant: "DataEntryAddedChange",
      type: "DATA_ENTRY",
      reason: "ADD",
      name: "hair_color",
      value: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8=",
    },
    {
      variant: "DataEntryUpdatedChange",
      type: "DATA_ENTRY",
      reason: "UPDATE",
      name: "eye_color",
      old_value: "Ymx1ZQ==",
      new_value: "Z3JlZW4=",
    },
    {
      variant: "DataEntryRemovedChange",
      type: "DATA_ENTRY",
      reason: "REMOVE",
      name: "shoe_size",
      old_value: "NDI=",
    },
  ],
});

/** Figma 12045:43014 "Home domain updated": "stellar.org → stellar.com" */
export const mockHomeDomainUpdated = buildTransaction({
  ledger: 51_450_000,
  txOrder: 21,
  createdAt: "2024-04-14T09:05:00Z",
  operations: [
    {
      operationType: "SET_OPTIONS",
      operationXdr: OP_XDR.setOptionsHomeDomain,
    },
  ],
  stateChanges: [
    {
      variant: "HomeDomainUpdatedChange",
      type: "HOME_DOMAIN",
      reason: "UPDATE",
      old_home_domain: "stellar.org",
      new_home_domain: "stellar.com",
    },
  ],
});

/** Figma 12116:48015 "Flags change": "+Revocable / −Clawback" */
export const mockFlagsChanged = buildTransaction({
  ledger: 51_440_000,
  txOrder: 25,
  createdAt: "2024-04-13T14:00:00Z",
  operations: [
    { operationType: "SET_OPTIONS", operationXdr: OP_XDR.setOptionsFlags },
  ],
  stateChanges: [
    {
      variant: "AccountFlagsChange",
      type: "FLAGS",
      reason: "SET",
      flags: ["AUTH_REVOCABLE"],
    },
    {
      variant: "AccountFlagsChange",
      type: "FLAGS",
      reason: "CLEAR",
      flags: ["AUTH_CLAWBACK_ENABLED"],
    },
  ],
});

/** Figma 12116:48292 + 12132:62680 "Balance authorization change" (multi) */
export const mockBalanceAuthChanged = buildTransaction({
  ledger: 51_430_000,
  txOrder: 28,
  createdAt: "2024-04-12T22:10:00Z",
  operations: [
    {
      operationType: "SET_TRUST_LINE_FLAGS",
      operationXdr: OP_XDR.setTrustLineFlags,
    },
    {
      operationType: "SET_TRUST_LINE_FLAGS",
      operationXdr: OP_XDR.setTrustLineFlags,
    },
  ],
  stateChanges: [
    {
      variant: "BalanceAuthorizationChange",
      type: "BALANCE_AUTHORIZATION",
      reason: "SET",
      token_id: MOCK_USDC_SAC,
      flags: ["AUTHORIZED"],
    },
    {
      variant: "BalanceAuthorizationChange",
      type: "BALANCE_AUTHORIZATION",
      reason: "CLEAR",
      token_id: MOCK_EURC_SAC,
      flags: ["AUTHORIZED"],
    },
  ],
});

/**
 * SEP-41 allowance approval — a new upstream category with no Figma frame yet;
 * rendered with the generic key/value card pending design.
 */
export const mockAllowanceApproved = buildTransaction({
  ledger: 51_430_000,
  txOrder: 28,
  createdAt: "2024-04-13T09:15:00Z",
  operations: [
    {
      operationType: "INVOKE_HOST_FUNCTION",
      operationXdr: OP_XDR.invokeHostFnTransfer,
    },
  ],
  stateChanges: [
    {
      variant: "AllowanceChange",
      type: "ALLOWANCE",
      reason: "UPDATE",
      token_id: MOCK_USDC_SAC,
      spender: MOCK_ROUTER_CONTRACT,
      amount: "1000000000", // 100.00 USDC
      expiration_ledger: 51_530_000,
    },
  ],
});

/**
 * A sponsorship operation. Upstream stopped indexing sponsorship reserve state
 * changes (the RESERVES category is gone), so the operation appears in history
 * with no state changes of its own — this fixture covers that path.
 */
export const mockSponsorshipOperation = buildTransaction({
  ledger: 51_420_000,
  txOrder: 30,
  createdAt: "2024-04-12T07:35:00Z",
  operations: [
    {
      operationType: "BEGIN_SPONSORING_FUTURE_RESERVES",
      operationXdr: OP_XDR.beginSponsoringFutureReserves,
    },
  ],
  stateChanges: [],
});

/**
 * A Blend pool emissions claim. The Blend row is ADDITIVE — it restates the
 * token and amount of the BalanceChange CREDIT beside it rather than replacing
 * it (see `@shared/api/types/blend.ts`), so this fixture is what proves the
 * protocol-action overlay relabels the row without double-counting the BLND
 * into a second amount or a state-change card.
 */
export const mockBlendEmissionsClaim = buildTransaction({
  ledger: 51_415_000,
  txOrder: 12,
  createdAt: "2024-04-11T16:20:00Z",
  operations: [
    {
      operationType: "INVOKE_HOST_FUNCTION",
      operationXdr: OP_XDR.invokeHostFnBlendClaim,
    },
  ],
  stateChanges: [
    balance("CREDIT", MOCK_BLND_SAC, "1015480"), // +0.101548 BLND
    {
      variant: "BlendEmissionsClaimChange",
      type: "BLEND_EMISSIONS",
      reason: "CLAIM",
      token_id: MOCK_BLND_SAC,
      amount: "1015480",
      pool_id: MOCK_BLEND_POOL,
    },
  ],
});

/**
 * A claimable balance created by someone else with this account as the only
 * claimant. Upstream reports no state change at all until the balance is
 * claimed, and the fee belongs to the creator — so the operation type is the
 * only thing the row has to render from.
 */
export const mockClaimableBalanceAirdrop = buildTransaction({
  ledger: 51_410_000,
  txOrder: 41,
  createdAt: "2024-04-10T11:05:00Z",
  operations: [
    {
      operationType: "CREATE_CLAIMABLE_BALANCE",
      operationXdr: OP_XDR.createClaimableBalance,
    },
  ],
  stateChanges: [],
  selfPaidFee: false,
});

/** Figma 12116:48895 "Balance change _Sent" + list row "XLM / Sent / -100.00 XLM" */
export const mockPaymentSent = buildTransaction({
  ledger: 51_400_000,
  txOrder: 15,
  createdAt: "2024-04-08T14:33:00Z",
  operations: [
    { operationType: "PAYMENT", operationXdr: OP_XDR.paymentSentXlm },
  ],
  stateChanges: [balance("DEBIT", MOCK_XLM_SAC, "1000000000")], // -100.00 XLM
});

/** Failed transaction: fee still charged, no other state changes */
export const mockFailedTransaction = buildTransaction({
  ledger: 51_390_000,
  txOrder: 33,
  createdAt: "2024-04-08T09:41:00Z",
  resultCode: "TransactionResultCodeTxFailed",
  operations: [
    {
      operationType: "INVOKE_HOST_FUNCTION",
      operationXdr: OP_XDR.invokeHostFnTransfer,
      successful: false,
    },
  ],
  stateChanges: [],
});

/** Every designed scenario, newest first — one full page of history */
export const mockScenarioTransactions: V2AccountTransaction[] = [
  mockSwapClassicDex,
  mockSwapViaContract,
  mockContractMultiAsset,
  mockContractNoBalanceChange,
  mockPaymentReceived,
  mockTokenTransferSent,
  mockTrustlineAdded,
  mockTrustlineMulti,
  mockAccountCreated,
  mockAccountMerged,
  mockSignerAdded,
  mockSignerMulti,
  mockThresholdsChange,
  mockDataEntryAdded,
  mockDataEntryMulti,
  mockHomeDomainUpdated,
  mockFlagsChanged,
  mockBalanceAuthChanged,
  mockAllowanceApproved,
  mockSponsorshipOperation,
  mockBlendEmissionsClaim,
  mockClaimableBalanceAirdrop,
  mockPaymentSent,
  mockFailedTransaction,
];
