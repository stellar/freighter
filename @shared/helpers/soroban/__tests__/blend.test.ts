import { Networks, scValToNative, xdr } from "stellar-sdk";
import {
  BlendRequestType,
  buildBlendRequestScVal,
  buildBlendSubmitOp,
} from "../blend";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { PUBLIC_SACS } from "@shared/constants/sac";
import { NETWORKS } from "@shared/constants/stellar";

const USDC_SAC = PUBLIC_SACS.USDC!;
const XLM_SAC = PUBLIC_SACS.XLM;
const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;
const PUBLIC_KEY = "GAX2VVWVHU5YQY5J3NJBXKHI3FFKZN54BE6GRJCWSIKSBZTQWJJNJMPC";

/**
 * 500 USDC (7 decimals) as SupplyCollateral. Generated from this encoder and
 * cross-checked byte-for-byte against `nativeToScVal` with an explicit type spec;
 * the same shape is produced by `scRequestVec` in wallet-backend
 * internal/integrationtests/infrastructure/blend_operations.go.
 *
 * If this value changes, the encoding changed — that is a protocol-level break,
 * not a test to update casually.
 */
const GOLDEN_REQUEST_XDR =
  "AAAAEQAAAAEAAAADAAAADwAAAAdhZGRyZXNzAAAAABIAAAABre/OWa7lKWj3YGHUlMJSW3Vln6QpamX0me8p5WR35JYAAAAPAAAABmFtb3VudAAAAAAACgAAAAAAAAAAAAAAASoF8gAAAAAPAAAADHJlcXVlc3RfdHlwZQAAAAMAAAAC";

describe("buildBlendRequestScVal", () => {
  const buildUsdcSupplyCollateral = () =>
    buildBlendRequestScVal({
      assetId: USDC_SAC,
      amount: "5000000000",
      requestType: BlendRequestType.SupplyCollateral,
      networkPassphrase: Networks.PUBLIC,
    });

  it("matches the golden XDR for a SupplyCollateral request", () => {
    expect(buildUsdcSupplyCollateral().toXDR("base64")).toBe(
      GOLDEN_REQUEST_XDR,
    );
  });

  it("orders the struct's symbol keys in ascending byte order", () => {
    // Soroban rejects a UDT map whose keys are not sorted. This is the invariant
    // that `nativeToScVal`'s localeCompare sort does not guarantee in general.
    const keys = buildUsdcSupplyCollateral()
      .map()!
      .map((entry) => entry.key().sym().toString());

    expect(keys).toEqual(["address", "amount", "request_type"]);
    expect([...keys].sort()).toEqual(keys);
  });

  it("round-trips to the input values", () => {
    expect(scValToNative(buildUsdcSupplyCollateral())).toEqual({
      address: USDC_SAC,
      amount: BigInt("5000000000"),
      request_type: BlendRequestType.SupplyCollateral,
    });
  });

  it("encodes amount as i128, not u32 or u64", () => {
    const amount = buildUsdcSupplyCollateral()
      .map()!
      .find((entry) => entry.key().sym().toString() === "amount")!
      .val();

    expect(amount.switch().name).toBe("scvI128");
  });

  it("preserves amounts beyond Number.MAX_SAFE_INTEGER", () => {
    const huge = "170141183460469231731687303715884105727";
    const request = buildBlendRequestScVal({
      assetId: USDC_SAC,
      amount: huge,
      requestType: BlendRequestType.SupplyCollateral,
      networkPassphrase: Networks.PUBLIC,
    });

    expect(scValToNative(request).amount).toBe(BigInt(huge));
  });

  it("encodes each request type as its documented numeric value", () => {
    // 0/1/2/3 are fixed by the Blend v2 contract; a silent renumbering here would
    // turn a deposit into a withdrawal.
    expect(BlendRequestType.Supply).toBe(0);
    expect(BlendRequestType.Withdraw).toBe(1);
    expect(BlendRequestType.SupplyCollateral).toBe(2);
    expect(BlendRequestType.WithdrawCollateral).toBe(3);
  });
});

describe("buildBlendSubmitOp", () => {
  const buildOp = () =>
    buildBlendSubmitOp({
      poolId: POOL_ID,
      publicKey: PUBLIC_KEY,
      requests: [
        buildBlendRequestScVal({
          assetId: XLM_SAC,
          amount: "10000000",
          requestType: BlendRequestType.SupplyCollateral,
          networkPassphrase: Networks.PUBLIC,
        }),
      ],
      networkPassphrase: Networks.PUBLIC,
    });

  const getInvokeArgs = (op: xdr.Operation) =>
    op.body().invokeHostFunctionOp().hostFunction().invokeContract();

  it("invokes submit on the pool contract", () => {
    const invocation = getInvokeArgs(buildOp());

    expect(invocation.functionName().toString()).toBe("submit");
    expect(
      scValToNative(xdr.ScVal.scvAddress(invocation.contractAddress())),
    ).toBe(POOL_ID);
  });

  it("passes the user as from, spender and to", () => {
    const args = getInvokeArgs(buildOp()).args();

    // These being equal is what makes simulation emit source-account credentials,
    // which is why no separate auth-entry signature is needed.
    expect(args.slice(0, 3).map(scValToNative)).toEqual([
      PUBLIC_KEY,
      PUBLIC_KEY,
      PUBLIC_KEY,
    ]);
  });

  it("passes requests as a vec", () => {
    const args = getInvokeArgs(buildOp()).args();

    expect(args).toHaveLength(4);
    expect(args[3].switch().name).toBe("scvVec");
    expect(scValToNative(args[3])).toEqual([
      {
        address: XLM_SAC,
        amount: BigInt("10000000"),
        request_type: BlendRequestType.SupplyCollateral,
      },
    ]);
  });
});
