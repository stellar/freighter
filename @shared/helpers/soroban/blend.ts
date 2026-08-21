import { xdr } from "stellar-sdk";
import { getSdk } from "@shared/helpers/stellar";

/**
 * Blend v2 pool `Request.request_type`. The protocol docs name 0/2 `Deposit` and
 * `Deposit Collateral`; blend-sdk-js names them `Supply`/`SupplyCollateral`.
 * Same values either way.
 *
 * Only the deposit/withdraw half is modelled here — borrow (4), repay (5) and the
 * auction fill types (6-9) are not reachable from Freighter.
 */
export enum BlendRequestType {
  Supply = 0,
  Withdraw = 1,
  SupplyCollateral = 2,
  WithdrawCollateral = 3,
}

interface BuildBlendRequestScValParams {
  /** The reserve's asset contract address (the SAC / SEP-41 token), not the pool. */
  assetId: string;
  /** Base-10 string in the asset's smallest unit (i.e. already scaled by decimals). */
  amount: string;
  requestType: BlendRequestType;
  networkPassphrase: string;
}

/**
 * Encodes Blend v2's `Request { address, amount, request_type }` struct.
 *
 * Soroban encodes a UDT struct as an ScMap whose Symbol keys are in ascending
 * BYTE order: address, amount, request_type. This is hand-built rather than going
 * through `nativeToScVal`, which sorts with `String.localeCompare` — locale
 * collation ignores `_`, so it is not byte order in general (it would invert
 * `r_two` vs `reactivity`, for instance). For these three keys the two orders
 * happen to agree, but relying on that is a trap for the next struct.
 *
 * Mirrors `scRequestVec` in wallet-backend
 * internal/integrationtests/infrastructure/blend_operations.go.
 */
export const buildBlendRequestScVal = ({
  assetId,
  amount,
  requestType,
  networkPassphrase,
}: BuildBlendRequestScValParams): xdr.ScVal => {
  const Sdk = getSdk(networkPassphrase);

  return xdr.ScVal.scvMap([
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("address"),
      val: new Sdk.Address(assetId).toScVal(),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("amount"),
      val: new Sdk.XdrLargeInt("i128", amount).toI128(),
    }),
    new xdr.ScMapEntry({
      key: xdr.ScVal.scvSymbol("request_type"),
      val: xdr.ScVal.scvU32(requestType),
    }),
  ]);
};

interface BuildBlendSubmitOpParams {
  poolId: string;
  publicKey: string;
  requests: xdr.ScVal[];
  networkPassphrase: string;
}

/**
 * Builds `pool.submit(from, spender, to, requests)`.
 *
 * All three addresses are the user: they own the position, pay for it, and receive
 * it. Because `from`/`spender` equal the transaction source account, simulation
 * returns the auth entry with source-account credentials, so the envelope
 * signature covers it — no `authorizeEntry` round-trip is needed.
 *
 * We use `submit` rather than `submit_with_allowance`: the pool pulls the asset via
 * `require_auth` on the SAC's `transfer` within this same transaction, so there is
 * no separate approval step.
 */
export const buildBlendSubmitOp = ({
  poolId,
  publicKey,
  requests,
  networkPassphrase,
}: BuildBlendSubmitOpParams) => {
  const Sdk = getSdk(networkPassphrase);
  const user = new Sdk.Address(publicKey).toScVal();

  return new Sdk.Contract(poolId).call(
    "submit",
    user,
    user,
    user,
    xdr.ScVal.scvVec(requests),
  );
};
