/**
 * Real pubnet history for one account, standing in for the
 * freighter-backend-v2 account-history endpoint
 * (`GET /api/v1/accounts/{address}/transactions`) while
 * `IS_HISTORY_V2_MOCKED` is true in `@shared/api/internal.ts`.
 *
 * Source account: GCBDC5AVPZEOSO3IAASQZSVRJMHX3UCCZH5O7S53FPZ636LQ5RHEW65H
 * Every transaction below is a real pubnet transaction of that account — real
 * hashes, ledgers, fees, and `operation_xdr` taken from the on-chain envelopes —
 * so every XDR-decoding path (advanced details sheet, invoke parameters) works,
 * and the stellar.expert links resolve as long as the wallet is pointed at
 * mainnet (the mock is served for any supported network).
 *
 * Provenance, per the `(captured)` / `(derived)` tag on each entry:
 *  - captured: served verbatim by the account-history endpoint.
 *  - derived: rebuilt from Horizon (transaction envelope + per-operation
 *    effects) using the wire conventions the capture confirmed — SAC contract
 *    ids as `token_id`, smallest-unit amounts, an XLM fee DEBIT only when this
 *    account paid the fee, and only this account's own operations within a
 *    transaction (the batch payouts below are 100-operation transactions
 *    upstream).
 *
 * The `BlendEmissionsClaimChange` rows on the three Blend `claim` transactions
 * are modelled from the upstream `Blend*Change` schema rather than captured, so
 * that protocol-action labelling has coverage. Mappers skip variants they do not
 * recognize, so an environment that does not emit them simply renders the
 * `BalanceChange` rows beside them.
 *
 * Two live-wire behaviours this data deliberately preserves:
 *  1. The endpoint returns pages **oldest-first**, with `next_cursor` walking
 *     forward in time. The array below is newest-first so the mocked list renders
 *     the way the design intends — `useGetHistoryDataV2` does not sort, so the
 *     ordering/pagination direction must be resolved before
 *     `IS_HISTORY_V2_MOCKED` is flipped off.
 *  2. Inbound payments carry no fee state change at all; the fee DEBIT only
 *     appears when this account is the fee payer, and then it duplicates the
 *     token/amount of a real balance movement (see the XLM path payments),
 *     which is exactly the case the amount-equals-fee_charged heuristic in
 *     `mappers/v2/balances.ts` has to handle.
 *
 * Known mock artifact: the mock is served for whatever account the dev wallet
 * holds, while these operations belong to the account above. `decodeCounterparty`
 * compares the decoded destination against the wallet's own key, so that
 * comparison never matches and inbound payments name the destination rather
 * than the sender as counterparty.
 *
 * To re-assemble after new activity: GET the transactions route for the account,
 * and rebuild anything outside the endpoint's retention window from Horizon.
 *
 * Transactions with no state changes are real: `CREATE_CLAIMABLE_BALANCE`
 * entries where this account is only a claimant move no balance until claimed,
 * and one Blend invocation charges a fee without touching a balance.
 */

import {
  AccountHistoryV2Response,
  V2AccountTransaction,
} from "../types/backend-api";

/** The account this history belongs to */
export const MOCK_SELF =
  "GCBDC5AVPZEOSO3IAASQZSVRJMHX3UCCZH5O7S53FPZ636LQ5RHEW65H";

/**
 * SAC contract ids for the assets in this history — on the wire every
 * `token_id` is a C-address, including native XLM.
 */
export const MOCK_XLM_SAC =
  "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
/** yUSDC — GDGTVWSM4MGS4T7Z6W4RPWOCHE2I6RDFCIFZGS3DOA63LWQTRNZNTTFF */
export const MOCK_YUSDC_SAC =
  "CDOFW7HNKLUZRLFZST4EW7V3AV4JI5IHMT6BPXXSY2IEFZ4NE5TWU2P4";
/** BLND — GDJEHTBE6ZHUXSWFI642DCGLUOECLHPF3KSXHPXTSTJ7E3JF6MQ5EZYY */
export const MOCK_BLND_SAC =
  "CD25MNVTZDL4Y3XBCPCJXGXATV5WUHHOWMYFF4YBEGU5FCPGMYTVG5JY";
/** CETES — GCRYUGD5NVARGXT56XEZI5CIFCQETYHAPQQTHO2O3IQZTHDH4LATMYWC */
export const MOCK_CETES_SAC =
  "CAL6ER2TI6CTRAY6BFXWNWA7WTYXUXTQCHUBCIBU5O6KM3HJFG6Z6VXV";

/**
 * Blend v2 pool contract ids this history interacts with. Names read off each
 * pool's `Name` instance-storage entry on pubnet; the `claim` calls below target
 * these contracts, and they are the `pool_id` on the BlendEmissionsClaimChange
 * rows.
 */
export const MOCK_BLEND_POOL_YIELDBLOX =
  "CCCCIQSDILITHMM7PBSLVDT5MISSY7R26MNZXCX4H7J5JQ5FPIYOGYFS";
export const MOCK_BLEND_POOL_ETHERFUSE =
  "CDMAVJPFXPADND3YRL4BSM3AKZWCTFMX27GLLXCML3PD62HEQS5FPVAI";

/** One full history fetch, newest first (see note 1 in the header) */
export const mockHistoryTransactions: V2AccountTransaction[] = [
  // 2026-08-04T11:05:46Z — PAYMENT (captured)
  {
    hash: "7768c8f31ef5e017f60c718e66fa1573110a41a2b8b47f67d228530d116ce56c",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63794261,
    ledger_created_at: "2026-08-04T11:05:46Z",
    is_fee_bump: false,
    ingested_at: "2026-08-04T11:05:53.481188Z",
    operations: [
      {
        id: "273994264668201057",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63794261,
        ledger_created_at: "2026-08-04T11:05:46Z",
        ingested_at: "2026-08-04T11:05:53.481188Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        ledger_number: 63794261,
        ledger_created_at: "2026-08-04T11:05:46Z",
        ingested_at: "2026-08-04T11:05:53.481188Z",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
      },
    ],
  },
  // 2026-08-03T11:05:23Z — PAYMENT (captured)
  {
    hash: "c01e5d8336e1db951e758bbc448f1172f7faf08e3360568c0e9703be82c907fd",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63778924,
    ledger_created_at: "2026-08-03T11:05:23Z",
    is_fee_bump: false,
    ingested_at: "2026-08-03T11:05:27.345854Z",
    operations: [
      {
        id: "273928392754139232",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63778924,
        ledger_created_at: "2026-08-03T11:05:23Z",
        ingested_at: "2026-08-03T11:05:27.345854Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        ledger_number: 63778924,
        ledger_created_at: "2026-08-03T11:05:23Z",
        ingested_at: "2026-08-03T11:05:27.345854Z",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
      },
    ],
  },
  // 2026-08-02T11:05:22Z — PAYMENT (captured)
  {
    hash: "446015f841ad51f81569b420f038c3467e48b17cb72290d8bfb5a5b509f19be4",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63763655,
    ledger_created_at: "2026-08-02T11:05:22Z",
    is_fee_bump: false,
    ingested_at: "2026-08-02T11:05:27.380358Z",
    operations: [
      {
        id: "273862812898766945",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63763655,
        ledger_created_at: "2026-08-02T11:05:22Z",
        ingested_at: "2026-08-02T11:05:27.380358Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        ledger_number: 63763655,
        ledger_created_at: "2026-08-02T11:05:22Z",
        ingested_at: "2026-08-02T11:05:27.380358Z",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
      },
    ],
  },
  // 2026-08-01T11:05:22Z — PAYMENT (captured)
  {
    hash: "97b3a7c5203c235261a156aa95714730b4982634032cc2e38a8f01fc12ff930e",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63748231,
    ledger_created_at: "2026-08-01T11:05:22Z",
    is_fee_bump: false,
    ingested_at: "2026-08-01T11:05:29.724499Z",
    operations: [
      {
        id: "273796567323177057",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63748231,
        ledger_created_at: "2026-08-01T11:05:22Z",
        ingested_at: "2026-08-01T11:05:29.724499Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        ledger_number: 63748231,
        ledger_created_at: "2026-08-01T11:05:22Z",
        ingested_at: "2026-08-01T11:05:29.724499Z",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
      },
    ],
  },
  // 2026-07-31T11:05:21Z — PAYMENT (captured)
  {
    hash: "4c3fd12c9f2af02fd2ce607a63bc87d0d6271e494c6f0982229ba64d83ea3b64",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63732736,
    ledger_created_at: "2026-07-31T11:05:21Z",
    is_fee_bump: false,
    ingested_at: "2026-07-31T11:05:27.520974Z",
    operations: [
      {
        id: "273730016804937823",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63732736,
        ledger_created_at: "2026-07-31T11:05:21Z",
        ingested_at: "2026-07-31T11:05:27.520974Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        ledger_number: 63732736,
        ledger_created_at: "2026-07-31T11:05:21Z",
        ingested_at: "2026-07-31T11:05:27.520974Z",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
      },
    ],
  },
  // 2026-07-30T11:05:16Z — PAYMENT (captured)
  {
    hash: "88d9c8ccc97780867e20d575bb94998f8516c5ec1f2680b47feac211890e830b",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63717275,
    ledger_created_at: "2026-07-30T11:05:16Z",
    is_fee_bump: false,
    ingested_at: "2026-07-30T11:05:20.727147Z",
    operations: [
      {
        id: "273663612315820130",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63717275,
        ledger_created_at: "2026-07-30T11:05:16Z",
        ingested_at: "2026-07-30T11:05:20.727147Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        ledger_number: 63717275,
        ledger_created_at: "2026-07-30T11:05:16Z",
        ingested_at: "2026-07-30T11:05:20.727147Z",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
      },
    ],
  },
  // 2026-07-29T11:05:17Z — PAYMENT (derived)
  {
    hash: "3c5d71eee46ec6b9ea4e42308cef50a31d52c3d41a5e0ecfd04c5f60b20d8cef",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63701857,
    ledger_created_at: "2026-07-29T11:05:17Z",
    is_fee_bump: false,
    ingested_at: "2026-07-29T11:05:17Z",
    operations: [
      {
        id: "273597392509677665",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63701857,
        ledger_created_at: "2026-07-29T11:05:17Z",
        ingested_at: "2026-07-29T11:05:17Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
        ledger_number: 63701857,
        ledger_created_at: "2026-07-29T11:05:17Z",
        ingested_at: "2026-07-29T11:05:17Z",
      },
    ],
  },
  // 2026-07-28T11:05:26Z — PAYMENT (derived)
  {
    hash: "0949c0868554d48da7aec01912cb5aa55a0ce1b87056abac0b3c87c39117510a",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63686562,
    ledger_created_at: "2026-07-28T11:05:26Z",
    is_fee_bump: false,
    ingested_at: "2026-07-28T11:05:26Z",
    operations: [
      {
        id: "273531700985045088",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63686562,
        ledger_created_at: "2026-07-28T11:05:26Z",
        ingested_at: "2026-07-28T11:05:26Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
        ledger_number: 63686562,
        ledger_created_at: "2026-07-28T11:05:26Z",
        ingested_at: "2026-07-28T11:05:26Z",
      },
    ],
  },
  // 2026-07-27T11:05:38Z — PAYMENT (derived)
  {
    hash: "1db49c4b2a7e27ff322cf7ca0778a06fa349467616dc80b4ee37b32473d2e066",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63671228,
    ledger_created_at: "2026-07-27T11:05:38Z",
    is_fee_bump: false,
    ingested_at: "2026-07-27T11:05:38Z",
    operations: [
      {
        id: "273465841956733022",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63671228,
        ledger_created_at: "2026-07-27T11:05:38Z",
        ingested_at: "2026-07-27T11:05:38Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
        ledger_number: 63671228,
        ledger_created_at: "2026-07-27T11:05:38Z",
        ingested_at: "2026-07-27T11:05:38Z",
      },
    ],
  },
  // 2026-07-26T11:05:22Z — PAYMENT (derived)
  {
    hash: "603ee361c9b9a0c9ce8537f8821ce44913bd0b28dfcca4176f0ff882e3177d98",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63655804,
    ledger_created_at: "2026-07-26T11:05:22Z",
    is_fee_bump: false,
    ingested_at: "2026-07-26T11:05:22Z",
    operations: [
      {
        id: "273399596380606558",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63655804,
        ledger_created_at: "2026-07-26T11:05:22Z",
        ingested_at: "2026-07-26T11:05:22Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
        ledger_number: 63655804,
        ledger_created_at: "2026-07-26T11:05:22Z",
        ingested_at: "2026-07-26T11:05:22Z",
      },
    ],
  },
  // 2026-07-25T11:05:18Z — PAYMENT (derived)
  {
    hash: "53775a4a0d2a60a88fa98cb14474cd8307d1ea87e5a99b1cdb0fd91617167f19",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63640395,
    ledger_created_at: "2026-07-25T11:05:18Z",
    is_fee_bump: false,
    ingested_at: "2026-07-25T11:05:18Z",
    operations: [
      {
        id: "273333415230369886",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63640395,
        ledger_created_at: "2026-07-25T11:05:18Z",
        ingested_at: "2026-07-25T11:05:18Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
        ledger_number: 63640395,
        ledger_created_at: "2026-07-25T11:05:18Z",
        ingested_at: "2026-07-25T11:05:18Z",
      },
    ],
  },
  // 2026-07-24T11:05:00Z — PAYMENT (derived)
  {
    hash: "f9e1dc90baddc939b789bdebe11e8f575bfbb481443349b88fb449f20a1cbc10",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63625023,
    ledger_created_at: "2026-07-24T11:05:00Z",
    is_fee_bump: false,
    ingested_at: "2026-07-24T11:05:00Z",
    operations: [
      {
        id: "273267392992690274",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAQAAAAAaSS3XDmz1h7lmlFpMJpBMiQfpnYt3e+bkzQQ20WI9/wAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACeVVTREMAAAAAAAAAAAAAAM062kzjDS5P+fW5F9nCOTSPRGUSC5NLY3A9tdoTi3LZAAAAAAAAAFY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63625023,
        ledger_created_at: "2026-07-24T11:05:00Z",
        ingested_at: "2026-07-24T11:05:00Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_YUSDC_SAC,
        amount: "86",
        ledger_number: 63625023,
        ledger_created_at: "2026-07-24T11:05:00Z",
        ingested_at: "2026-07-24T11:05:00Z",
      },
    ],
  },
  // 2026-07-21T14:56:15Z — PAYMENT (derived)
  {
    hash: "9d0be47dcb88fd24ff9971b609a617590d183f4d7aa79654060cf330bc0bd2a8",
    fee_charged: "100",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63581380,
    ledger_created_at: "2026-07-21T14:56:15Z",
    is_fee_bump: false,
    ingested_at: "2026-07-21T14:56:15Z",
    operations: [
      {
        id: "273079947734732801",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAAAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAAAAAAAAAAAAAE=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63581380,
        ledger_created_at: "2026-07-21T14:56:15Z",
        ingested_at: "2026-07-21T14:56:15Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_XLM_SAC,
        amount: "1",
        ledger_number: 63581380,
        ledger_created_at: "2026-07-21T14:56:15Z",
        ingested_at: "2026-07-21T14:56:15Z",
      },
    ],
  },
  // 2026-07-17T21:17:05Z — CREATE_CLAIMABLE_BALANCE (derived)
  {
    hash: "8c2178af30c48c5ddadc46f95cf43e4ba1eabe2cbe0beec26045d5951a96f2c2",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63523956,
    ledger_created_at: "2026-07-17T21:17:05Z",
    is_fee_bump: false,
    ingested_at: "2026-07-17T21:17:05Z",
    operations: [
      {
        id: "272833313532919813",
        operation_type: "CREATE_CLAIMABLE_BALANCE",
        operation_xdr:
          "AAAAAAAAAA4AAAABTE1YAAAAAACSXnd8eAoXQ9H8F1ZFVIV0BjTEuYwxt0iWAIb271TXRgAAAAAAyPVQAAAAAgAAAAAAAAAAczRI0wqi9oqaOFFzGupKaqkvVLxzjSmMUDmDFiMKB90AAAAAAAAAAAAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAAAQAAAAAal6QUA==",
        result_code: "op_success",
        successful: true,
        ledger_number: 63523956,
        ledger_created_at: "2026-07-17T21:17:05Z",
        ingested_at: "2026-07-17T21:17:05Z",
      },
    ],
    state_changes: [],
  },
  // 2026-07-15T21:19:59Z — CREATE_CLAIMABLE_BALANCE (derived)
  {
    hash: "3801fa346b0ed5c88a39890065f62e11f84f5c1074d83ddbdc5990314ccd49c2",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63493262,
    ledger_created_at: "2026-07-15T21:19:59Z",
    is_fee_bump: false,
    ingested_at: "2026-07-15T21:19:59Z",
    operations: [
      {
        id: "272701483806707751",
        operation_type: "CREATE_CLAIMABLE_BALANCE",
        operation_xdr:
          "AAAAAAAAAA4AAAABTE1YAAAAAACSXnd8eAoXQ9H8F1ZFVIV0BjTEuYwxt0iWAIb271TXRgAAAAAAzddQAAAAAgAAAAAAAAAAczRI0wqi9oqaOFFzGupKaqkvVLxzjSmMUDmDFiMKB90AAAAAAAAAAAAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAAAQAAAAAalvt/A==",
        result_code: "op_success",
        successful: true,
        ledger_number: 63493262,
        ledger_created_at: "2026-07-15T21:19:59Z",
        ingested_at: "2026-07-15T21:19:59Z",
      },
    ],
    state_changes: [],
  },
  // 2026-07-14T19:34:06Z — INVOKE_HOST_FUNCTION (derived)
  {
    hash: "3d21021e872cf231c7dc3b02277083acae2122260a16c406a89d4ff6f461923d",
    fee_charged: "740179",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63477407,
    ledger_created_at: "2026-07-14T19:34:06Z",
    is_fee_bump: false,
    ingested_at: "2026-07-14T19:34:06Z",
    operations: [
      {
        id: "272633387101843457",
        operation_type: "INVOKE_HOST_FUNCTION",
        operation_xdr:
          "AAAAAAAAABgAAAAAAAAAAU9L7jIKgL+xNHUBt77bmD3cRKsRgST2bT4+ca7iPbMAAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAIIxdBV+SOk7aAAlDMqxSw990ELJ+u/Luyvz7flw7E5LAAAAEgAAAAAAAAAA3sWMQmr39gmNnj9i+Pc5M6Oj70tIs+Kgr1PkGlGMFFoAAAADAACY1gAAAAEAAAAAAAAAAAAAAAFPS+4yCoC/sTR1Abe+25g93ESrEYEk9m0+PnGu4j2zAAAAAAh0cmFuc2ZlcgAAAAMAAAASAAAAAAAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAABIAAAAAAAAAAN7FjEJq9/YJjZ4/Yvj3OTOjo+9LSLPioK9T5BpRjBRaAAAAAwAAmNYAAAAA",
        result_code: "op_success",
        successful: true,
        ledger_number: 63477407,
        ledger_created_at: "2026-07-14T19:34:06Z",
        ingested_at: "2026-07-14T19:34:06Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "740179",
        ledger_number: 63477407,
        ledger_created_at: "2026-07-14T19:34:06Z",
        ingested_at: "2026-07-14T19:34:06Z",
      },
    ],
  },
  // 2026-07-14T19:11:50Z — PAYMENT + CREATE_CLAIMABLE_BALANCE (derived)
  {
    hash: "8d910de4b0b12dbafbacf2d7f0ef72a75b7db4ee01beeb86a5145072ee333c89",
    fee_charged: "9800",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63477180,
    ledger_created_at: "2026-07-14T19:11:50Z",
    is_fee_bump: false,
    ingested_at: "2026-07-14T19:11:50Z",
    operations: [
      {
        id: "272632412142379043",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAAAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAAAAAAAAAAAAAE=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63477180,
        ledger_created_at: "2026-07-14T19:11:50Z",
        ingested_at: "2026-07-14T19:11:50Z",
      },
      {
        id: "272632412142379044",
        operation_type: "CREATE_CLAIMABLE_BALANCE",
        operation_xdr:
          "AAAAAAAAAA4AAAABQkZBQgAAAACKr/ohVPxZnFsJ+P87qIXPyGoHXxwHgJQRTd0ZXq5qYAAAAAACqNjgAAAAAgAAAAAAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAAAAAAAAAAAAAB41dT0KVOKG69iYvk51zM8aKmqsnQWJgCYMuIbRsj0+gAAAAA=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63477180,
        ledger_created_at: "2026-07-14T19:11:50Z",
        ingested_at: "2026-07-14T19:11:50Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_XLM_SAC,
        amount: "1",
        ledger_number: 63477180,
        ledger_created_at: "2026-07-14T19:11:50Z",
        ingested_at: "2026-07-14T19:11:50Z",
      },
    ],
  },
  // 2026-07-14T19:05:50Z — CHANGE_TRUST + PATH_PAYMENT_STRICT_SEND (derived)
  {
    hash: "83a923f0f629c422d3ba043d0fdf75b9ac42b68595c312df5f6e43ff8f57f067",
    fee_charged: "200",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63477118,
    ledger_created_at: "2026-07-14T19:05:50Z",
    is_fee_bump: false,
    ingested_at: "2026-07-14T19:05:50Z",
    operations: [
      {
        id: "272632145854439425",
        operation_type: "CHANGE_TRUST",
        operation_xdr:
          "AAAAAAAAAAYAAAACQ0VURVMAAAAAAAAAAAAAAKOKGH1tQRNeffXJlHRIKKBJ4OB8ITO7TtohmZxn4sE2f/////////8=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63477118,
        ledger_created_at: "2026-07-14T19:05:50Z",
        ingested_at: "2026-07-14T19:05:50Z",
      },
      {
        id: "272632145854439426",
        operation_type: "PATH_PAYMENT_STRICT_SEND",
        operation_xdr:
          "AAAAAAAAAA0AAAAAAAAAAAAPQkAAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAACQ0VURVMAAAAAAAAAAAAAAKOKGH1tQRNeffXJlHRIKKBJ4OB8ITO7TtohmZxn4sE2AAAAAAApM4kAAAACAAAAAVVTREMAAAAAO5kROA7+mIugqJAOsc/kTzZvfb6Ua+0HckD39iTfFcUAAAABbmVjbwAAAAB620wjs/ku4I9d3PBQoCNcr6mbh7Jc97MxoYRkjyz1pw==",
        result_code: "op_success",
        successful: true,
        ledger_number: 63477118,
        ledger_created_at: "2026-07-14T19:05:50Z",
        ingested_at: "2026-07-14T19:05:50Z",
      },
    ],
    state_changes: [
      {
        variant: "TrustlineAddedChange",
        type: "TRUSTLINE",
        reason: "ADD",
        token_id: MOCK_CETES_SAC,
        limit: "922337203685.4775807",
        ledger_number: 63477118,
        ledger_created_at: "2026-07-14T19:05:50Z",
        ingested_at: "2026-07-14T19:05:50Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_CETES_SAC,
        amount: "2756762",
        ledger_number: 63477118,
        ledger_created_at: "2026-07-14T19:05:50Z",
        ingested_at: "2026-07-14T19:05:50Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "1000000",
        ledger_number: 63477118,
        ledger_created_at: "2026-07-14T19:05:50Z",
        ingested_at: "2026-07-14T19:05:50Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "200",
        ledger_number: 63477118,
        ledger_created_at: "2026-07-14T19:05:50Z",
        ingested_at: "2026-07-14T19:05:50Z",
      },
    ],
  },
  // 2026-07-09T06:51:04Z — PAYMENT (derived)
  {
    hash: "490134eb7e96c8b82582f6e29bbfa843d10cdf388d070711752216e073cc4981",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63395397,
    ledger_created_at: "2026-07-09T06:51:04Z",
    is_fee_bump: false,
    ingested_at: "2026-07-09T06:51:04Z",
    operations: [
      {
        id: "272281156832329807",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAAAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAAAAAAAAAAAAAE=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63395397,
        ledger_created_at: "2026-07-09T06:51:04Z",
        ingested_at: "2026-07-09T06:51:04Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_XLM_SAC,
        amount: "1",
        ledger_number: 63395397,
        ledger_created_at: "2026-07-09T06:51:04Z",
        ingested_at: "2026-07-09T06:51:04Z",
      },
    ],
  },
  // 2026-07-08T04:36:12Z — PAYMENT (derived)
  {
    hash: "e6f2e8d32578b1b476422e4bfaa911130f59d72367e82bf1dad55b62ad84b648",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63379155,
    ledger_created_at: "2026-07-08T04:36:12Z",
    is_fee_bump: false,
    ingested_at: "2026-07-08T04:36:12Z",
    operations: [
      {
        id: "272211397973676111",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAAAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAAAAAAAAAAAAAE=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63379155,
        ledger_created_at: "2026-07-08T04:36:12Z",
        ingested_at: "2026-07-08T04:36:12Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_XLM_SAC,
        amount: "1",
        ledger_number: 63379155,
        ledger_created_at: "2026-07-08T04:36:12Z",
        ingested_at: "2026-07-08T04:36:12Z",
      },
    ],
  },
  // 2026-07-08T01:25:59Z — PAYMENT (derived)
  {
    hash: "50dbc9ad4821ee6248d975482f2629d0bdce184d35efe48bce761237410f9185",
    fee_charged: "9900",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63377207,
    ledger_created_at: "2026-07-08T01:25:59Z",
    is_fee_bump: false,
    ingested_at: "2026-07-08T01:25:59Z",
    operations: [
      {
        id: "272203031377276957",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAAAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAAAAAAAAAAAAAE=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63377207,
        ledger_created_at: "2026-07-08T01:25:59Z",
        ingested_at: "2026-07-08T01:25:59Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_XLM_SAC,
        amount: "1",
        ledger_number: 63377207,
        ledger_created_at: "2026-07-08T01:25:59Z",
        ingested_at: "2026-07-08T01:25:59Z",
      },
    ],
  },
  // 2026-07-06T06:16:16Z — PAYMENT (derived)
  {
    hash: "a416227194f67990b74cecbb34ba5fe19f6371b08bf54bb482ab57b2e53ee65e",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63350558,
    ledger_created_at: "2026-07-06T06:16:16Z",
    is_fee_bump: false,
    ingested_at: "2026-07-06T06:16:16Z",
    operations: [
      {
        id: "272088574793633871",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAAAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAAAAAAAAAAAAAE=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63350558,
        ledger_created_at: "2026-07-06T06:16:16Z",
        ingested_at: "2026-07-06T06:16:16Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_XLM_SAC,
        amount: "1",
        ledger_number: 63350558,
        ledger_created_at: "2026-07-06T06:16:16Z",
        ingested_at: "2026-07-06T06:16:16Z",
      },
    ],
  },
  // 2026-07-05T17:47:10Z — PAYMENT (derived)
  {
    hash: "ce58cc1be269cfe3738c71ca9ec0ccf158af01266337bfb3fa419473910c5372",
    fee_charged: "10000",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63342835,
    ledger_created_at: "2026-07-05T17:47:10Z",
    is_fee_bump: false,
    ingested_at: "2026-07-05T17:47:10Z",
    operations: [
      {
        id: "272055404760989775",
        operation_type: "PAYMENT",
        operation_xdr:
          "AAAAAAAAAAEAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAAAAAAAAAAAAAE=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63342835,
        ledger_created_at: "2026-07-05T17:47:10Z",
        ingested_at: "2026-07-05T17:47:10Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_XLM_SAC,
        amount: "1",
        ledger_number: 63342835,
        ledger_created_at: "2026-07-05T17:47:10Z",
        ingested_at: "2026-07-05T17:47:10Z",
      },
    ],
  },
  // 2026-06-17T14:46:57Z — PATH_PAYMENT_STRICT_SEND (derived)
  {
    hash: "b1b01865e62b30508124ac975c956d2a94e85708068f35bd5d8da9faee07caa3",
    fee_charged: "100",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63072047,
    ledger_created_at: "2026-06-17T14:46:57Z",
    is_fee_bump: false,
    ingested_at: "2026-06-17T14:46:57Z",
    operations: [
      {
        id: "270892379157553153",
        operation_type: "PATH_PAYMENT_STRICT_SEND",
        operation_xdr:
          "AAAAAAAAAA0AAAAAAAAAAACYloAAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAABQkxORAAAAADSQ8wk9k9LysVHuaGIy6OIJZ3l2qVzvvOU0/JtJfMh0gAAAAACxuYLAAAAAA==",
        result_code: "op_success",
        successful: true,
        ledger_number: 63072047,
        ledger_created_at: "2026-06-17T14:46:57Z",
        ingested_at: "2026-06-17T14:46:57Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_BLND_SAC,
        amount: "47060052",
        ledger_number: 63072047,
        ledger_created_at: "2026-06-17T14:46:57Z",
        ingested_at: "2026-06-17T14:46:57Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "10000000",
        ledger_number: 63072047,
        ledger_created_at: "2026-06-17T14:46:57Z",
        ingested_at: "2026-06-17T14:46:57Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "100",
        ledger_number: 63072047,
        ledger_created_at: "2026-06-17T14:46:57Z",
        ingested_at: "2026-06-17T14:46:57Z",
      },
    ],
  },
  // 2026-06-16T19:18:17Z — INVOKE_HOST_FUNCTION (derived)
  {
    hash: "5d0337022711bf5ebc9ae764533052d7744d839baa690cd1f9a13d346b3cc656",
    fee_charged: "28755",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63059992,
    ledger_created_at: "2026-06-16T19:18:17Z",
    is_fee_bump: false,
    ingested_at: "2026-06-16T19:18:17Z",
    operations: [
      {
        id: "270840603326672897",
        operation_type: "INVOKE_HOST_FUNCTION",
        operation_xdr:
          "AAAAAAAAABgAAAAAAAAAAYQkQkNC0TOxn3hkuo59YiUsfjrzG5uK/D/T1MOlejDjAAAABWNsYWltAAAAAAAAAwAAABIAAAAAAAAAAIIxdBV+SOk7aAAlDMqxSw990ELJ+u/Luyvz7flw7E5LAAAAEAAAAAEAAAABAAAAAwAAAAMAAAASAAAAAAAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAAAEAAAAAAAAAAAAAAAGEJEJDQtEzsZ94ZLqOfWIlLH468xubivw/09TDpXow4wAAAAVjbGFpbQAAAAAAAAMAAAASAAAAAAAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAABAAAAABAAAAAQAAAAMAAAADAAAAEgAAAAAAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAAA",
        result_code: "op_success",
        successful: true,
        ledger_number: 63059992,
        ledger_created_at: "2026-06-16T19:18:17Z",
        ingested_at: "2026-06-16T19:18:17Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_BLND_SAC,
        amount: "1015480",
        ledger_number: 63059992,
        ledger_created_at: "2026-06-16T19:18:17Z",
        ingested_at: "2026-06-16T19:18:17Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "28755",
        ledger_number: 63059992,
        ledger_created_at: "2026-06-16T19:18:17Z",
        ingested_at: "2026-06-16T19:18:17Z",
      },
      // Blend emitter row — restates the 0.101548 BLND of the CREDIT above
      {
        variant: "BlendEmissionsClaimChange",
        type: "BLEND_EMISSIONS",
        reason: "CLAIM",
        token_id: MOCK_BLND_SAC,
        amount: "1015480",
        pool_id: MOCK_BLEND_POOL_YIELDBLOX,
        ledger_number: 63059992,
        ledger_created_at: "2026-06-16T19:18:17Z",
        ingested_at: "2026-06-16T19:18:17Z",
      },
    ],
  },
  // 2026-06-16T18:49:30Z — PATH_PAYMENT_STRICT_SEND (derived)
  {
    hash: "12adf19b812bc71daf87383e59795fe7c9849b94a45a73fda42302da89ccc760",
    fee_charged: "100",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63059695,
    ledger_created_at: "2026-06-16T18:49:30Z",
    is_fee_bump: false,
    ingested_at: "2026-06-16T18:49:30Z",
    operations: [
      {
        id: "270839327720976385",
        operation_type: "PATH_PAYMENT_STRICT_SEND",
        operation_xdr:
          "AAAAAAAAAA0AAAAAAAAAAACYloAAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAABQkxORAAAAADSQ8wk9k9LysVHuaGIy6OIJZ3l2qVzvvOU0/JtJfMh0gAAAAACtW7uAAAAAgAAAAFVU0RDAAAAADuZETgO/piLoKiQDrHP5E82b32+lGvtB3JA9/Yk3xXFAAAAAXNVU0QAAAAAj2+KyPmYjEMFuwqWpv33O3NZCGoASCtyAGDvCBhfZ/Q=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63059695,
        ledger_created_at: "2026-06-16T18:49:30Z",
        ingested_at: "2026-06-16T18:49:30Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_BLND_SAC,
        amount: "45891628",
        ledger_number: 63059695,
        ledger_created_at: "2026-06-16T18:49:30Z",
        ingested_at: "2026-06-16T18:49:30Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "10000000",
        ledger_number: 63059695,
        ledger_created_at: "2026-06-16T18:49:30Z",
        ingested_at: "2026-06-16T18:49:30Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "100",
        ledger_number: 63059695,
        ledger_created_at: "2026-06-16T18:49:30Z",
        ingested_at: "2026-06-16T18:49:30Z",
      },
    ],
  },
  // 2026-06-16T17:57:22Z — PATH_PAYMENT_STRICT_SEND (derived)
  {
    hash: "5f91e96f423c13ce0ac110538ff72a4a83a3f0f074798dbc32106c8d2b0b6bc4",
    fee_charged: "100",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 63059158,
    ledger_created_at: "2026-06-16T17:57:22Z",
    is_fee_bump: false,
    ingested_at: "2026-06-16T17:57:22Z",
    operations: [
      {
        id: "270837021324472321",
        operation_type: "PATH_PAYMENT_STRICT_SEND",
        operation_xdr:
          "AAAAAAAAAA0AAAAAAAAAAACYloAAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAABQkxORAAAAADSQ8wk9k9LysVHuaGIy6OIJZ3l2qVzvvOU0/JtJfMh0gAAAAACqeerAAAAAgAAAAFVU0RDAAAAADuZETgO/piLoKiQDrHP5E82b32+lGvtB3JA9/Yk3xXFAAAAAXNVU0QAAAAAj2+KyPmYjEMFuwqWpv33O3NZCGoASCtyAGDvCBhfZ/Q=",
        result_code: "op_success",
        successful: true,
        ledger_number: 63059158,
        ledger_created_at: "2026-06-16T17:57:22Z",
        ingested_at: "2026-06-16T17:57:22Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_BLND_SAC,
        amount: "45140812",
        ledger_number: 63059158,
        ledger_created_at: "2026-06-16T17:57:22Z",
        ingested_at: "2026-06-16T17:57:22Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "10000000",
        ledger_number: 63059158,
        ledger_created_at: "2026-06-16T17:57:22Z",
        ingested_at: "2026-06-16T17:57:22Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "100",
        ledger_number: 63059158,
        ledger_created_at: "2026-06-16T17:57:22Z",
        ingested_at: "2026-06-16T17:57:22Z",
      },
    ],
  },
  // 2026-06-11T16:08:54Z — PATH_PAYMENT_STRICT_SEND (derived)
  {
    hash: "bacfd9fd64662e29e1b643cd3a5cd66f9cddf386fbb370231b29ab91175cf2f6",
    fee_charged: "100",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 62983700,
    ledger_created_at: "2026-06-11T16:08:54Z",
    is_fee_bump: false,
    ingested_at: "2026-06-11T16:08:54Z",
    operations: [
      {
        id: "270512931681144833",
        operation_type: "PATH_PAYMENT_STRICT_SEND",
        operation_xdr:
          "AAAAAAAAAA0AAAAAAAAAAACYloAAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAABQkxORAAAAADSQ8wk9k9LysVHuaGIy6OIJZ3l2qVzvvOU0/JtJfMh0gAAAAACMGkwAAAAAgAAAAFXWFQAAAAAACQV1PLpXADIbbdk959winF8dScGgOBqBz6KleQxvI3JAAAAAVNWUgAAAAAAqI0WcVM29x222mnPLPwDrRd2NK7uLT8IxqsWHrjEluY=",
        result_code: "op_success",
        successful: true,
        ledger_number: 62983700,
        ledger_created_at: "2026-06-11T16:08:54Z",
        ingested_at: "2026-06-11T16:08:54Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_BLND_SAC,
        amount: "37098069",
        ledger_number: 62983700,
        ledger_created_at: "2026-06-11T16:08:54Z",
        ingested_at: "2026-06-11T16:08:54Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "10000000",
        ledger_number: 62983700,
        ledger_created_at: "2026-06-11T16:08:54Z",
        ingested_at: "2026-06-11T16:08:54Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "100",
        ledger_number: 62983700,
        ledger_created_at: "2026-06-11T16:08:54Z",
        ingested_at: "2026-06-11T16:08:54Z",
      },
    ],
  },
  // 2026-06-10T19:56:42Z — INVOKE_HOST_FUNCTION (derived)
  {
    hash: "9d7a1efaf4eeac29a8f10954d8ee7f45ef40e1a10f809917b33509721f848e25",
    fee_charged: "500958",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 62971291,
    ledger_created_at: "2026-06-10T19:56:42Z",
    is_fee_bump: false,
    ingested_at: "2026-06-10T19:56:42Z",
    operations: [
      {
        id: "270459635432599553",
        operation_type: "INVOKE_HOST_FUNCTION",
        operation_xdr:
          "AAAAAAAAABgAAAAAAAAAAdgKpeW7wDaPeIr4GTNgVmwplZfXzLXcTF7eP2jkhLpXAAAABWNsYWltAAAAAAAAAwAAABIAAAAAAAAAAIIxdBV+SOk7aAAlDMqxSw990ELJ+u/Luyvz7flw7E5LAAAAEAAAAAEAAAABAAAAAwAAAAMAAAASAAAAAAAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAAAEAAAAAAAAAAAAAAAHYCqXlu8A2j3iK+BkzYFZsKZWX18y13Exe3j9o5IS6VwAAAAVjbGFpbQAAAAAAAAMAAAASAAAAAAAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAABAAAAABAAAAAQAAAAMAAAADAAAAEgAAAAAAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAAA",
        result_code: "op_success",
        successful: true,
        ledger_number: 62971291,
        ledger_created_at: "2026-06-10T19:56:42Z",
        ingested_at: "2026-06-10T19:56:42Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_BLND_SAC,
        amount: "83407357",
        ledger_number: 62971291,
        ledger_created_at: "2026-06-10T19:56:42Z",
        ingested_at: "2026-06-10T19:56:42Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "500958",
        ledger_number: 62971291,
        ledger_created_at: "2026-06-10T19:56:42Z",
        ingested_at: "2026-06-10T19:56:42Z",
      },
      // Blend emitter row — restates the 8.3407357 BLND of the CREDIT above
      {
        variant: "BlendEmissionsClaimChange",
        type: "BLEND_EMISSIONS",
        reason: "CLAIM",
        token_id: MOCK_BLND_SAC,
        amount: "83407357",
        pool_id: MOCK_BLEND_POOL_ETHERFUSE,
        ledger_number: 62971291,
        ledger_created_at: "2026-06-10T19:56:42Z",
        ingested_at: "2026-06-10T19:56:42Z",
      },
    ],
  },
  // 2026-06-10T19:56:19Z — INVOKE_HOST_FUNCTION (derived)
  {
    hash: "65ed38ada4ab50475dbee0ffc8e66b1c599de9f66f2dcd73e63c47edfa3b6db6",
    fee_charged: "919988",
    result_code: "TransactionResultCodeTxSuccess",
    ledger_number: 62971287,
    ledger_created_at: "2026-06-10T19:56:19Z",
    is_fee_bump: false,
    ingested_at: "2026-06-10T19:56:19Z",
    operations: [
      {
        id: "270459618252664833",
        operation_type: "INVOKE_HOST_FUNCTION",
        operation_xdr:
          "AAAAAAAAABgAAAAAAAAAAYQkQkNC0TOxn3hkuo59YiUsfjrzG5uK/D/T1MOlejDjAAAABWNsYWltAAAAAAAAAwAAABIAAAAAAAAAAIIxdBV+SOk7aAAlDMqxSw990ELJ+u/Luyvz7flw7E5LAAAAEAAAAAEAAAABAAAAAwAAAAMAAAASAAAAAAAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAAAEAAAAAAAAAAAAAAAGEJEJDQtEzsZ94ZLqOfWIlLH468xubivw/09TDpXow4wAAAAVjbGFpbQAAAAAAAAMAAAASAAAAAAAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAABAAAAABAAAAAQAAAAMAAAADAAAAEgAAAAAAAAAAgjF0FX5I6TtoACUMyrFLD33QQsn678u7K/Pt+XDsTksAAAAA",
        result_code: "op_success",
        successful: true,
        ledger_number: 62971287,
        ledger_created_at: "2026-06-10T19:56:19Z",
        ingested_at: "2026-06-10T19:56:19Z",
      },
    ],
    state_changes: [
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "CREDIT",
        token_id: MOCK_BLND_SAC,
        amount: "68427820",
        ledger_number: 62971287,
        ledger_created_at: "2026-06-10T19:56:19Z",
        ingested_at: "2026-06-10T19:56:19Z",
      },
      {
        variant: "BalanceChange",
        type: "BALANCE",
        reason: "DEBIT",
        token_id: MOCK_XLM_SAC,
        amount: "919988",
        ledger_number: 62971287,
        ledger_created_at: "2026-06-10T19:56:19Z",
        ingested_at: "2026-06-10T19:56:19Z",
      },
      // Blend emitter row — restates the 6.842782 BLND of the CREDIT above
      {
        variant: "BlendEmissionsClaimChange",
        type: "BLEND_EMISSIONS",
        reason: "CLAIM",
        token_id: MOCK_BLND_SAC,
        amount: "68427820",
        pool_id: MOCK_BLEND_POOL_YIELDBLOX,
        ledger_number: 62971287,
        ledger_created_at: "2026-06-10T19:56:19Z",
        ingested_at: "2026-06-10T19:56:19Z",
      },
    ],
  },
];

/* ── Assembled pages / responses ─────────────────────────────────────────── */

/** Cursors are opaque server-side; mocks use the last item's first-op TOID */
const cursorFor = (tx: V2AccountTransaction) => tx.operations[0]?.id ?? tx.hash;

const pageFor = (
  items: V2AccountTransaction[],
  hasNext: boolean,
  hasPrevious: boolean,
): AccountHistoryV2Response => ({
  data: items,
  pagination: {
    next_cursor:
      hasNext && items.length ? cursorFor(items[items.length - 1]) : null,
    prev_cursor: hasPrevious && items.length ? cursorFor(items[0]) : null,
    has_next: hasNext,
    has_previous: hasPrevious,
  },
});

/** The full history in one page */
export const mockAccountHistoryV2Response = pageFor(
  mockHistoryTransactions,
  false,
  false,
);

/**
 * Mock of the v2 account-history fetch. `getAccountHistoryV2` in
 * `@shared/api/internal.ts` returns this while the endpoint is mocked.
 * Supports cursor pagination so infinite scroll can be built against it.
 */
export const mockFetchAccountHistoryV2 = async ({
  limit = 10,
  cursor,
}: {
  address?: string;
  limit?: number;
  cursor?: string;
} = {}): Promise<AccountHistoryV2Response> => {
  const start = cursor
    ? mockHistoryTransactions.findIndex((tx) => cursorFor(tx) === cursor) + 1
    : 0;
  const items = mockHistoryTransactions.slice(start, start + limit);
  return pageFor(
    items,
    start + limit < mockHistoryTransactions.length,
    start > 0,
  );
};
