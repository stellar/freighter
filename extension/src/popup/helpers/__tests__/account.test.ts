import { HorizonOperation } from "@shared/api/types";
import { operationMatchesAssetKey } from "popup/helpers/account";

const XLM_CODED_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const XLM_CODED_KEY = `XLM:${XLM_CODED_ISSUER}`;

const nativePayment = {
  type: "payment",
  asset_type: "native",
  amount: "10",
} as unknown as HorizonOperation;

const xlmCodedClassicPayment = {
  type: "payment",
  asset_type: "credit_alphanum4",
  asset_code: "XLM",
  asset_issuer: XLM_CODED_ISSUER,
  amount: "10",
} as unknown as HorizonOperation;

// Issuer for the path payments' destination leg — distinct from XLM_CODED_ISSUER
// so the source and destination assets never collide, which is what lets these
// fixtures discriminate the source_asset_* arm from the primary arm.
const DEST_ASSET_ISSUER =
  "GB7UT5EMHRRA4TLQ7SHTXS2QL7LZPEUQP625HKVB3DEL7O5M47FCLFY6";

// A path payment whose SOURCE leg is genuine native XLM; the destination leg
// is an unrelated classic asset.
const nativeSourcePathPayment = {
  type: "path_payment_strict_send",
  asset_type: "credit_alphanum4",
  asset_code: "USD",
  asset_issuer: DEST_ASSET_ISSUER,
  source_asset_type: "native",
  amount: "10",
  source_amount: "10",
} as unknown as HorizonOperation;

// A path payment whose SOURCE leg is the classic asset coded "XLM" (same
// code/issuer as xlmCodedClassicPayment); the destination leg is an unrelated
// classic asset.
const xlmCodedSourcePathPayment = {
  type: "path_payment_strict_send",
  asset_type: "credit_alphanum4",
  asset_code: "USD",
  asset_issuer: DEST_ASSET_ISSUER,
  source_asset_type: "credit_alphanum4",
  source_asset_code: "XLM",
  source_asset_issuer: XLM_CODED_ISSUER,
  amount: "10",
  source_amount: "10",
} as unknown as HorizonOperation;

describe("operationMatchesAssetKey", () => {
  it("files a native payment under the native key", () => {
    expect(operationMatchesAssetKey("native", nativePayment)).toBe(true);
  });

  it("does not file a native payment under a classic asset using the native code", () => {
    expect(operationMatchesAssetKey(XLM_CODED_KEY, nativePayment)).toBe(false);
  });

  it("files a classic payment under its own key", () => {
    expect(
      operationMatchesAssetKey(XLM_CODED_KEY, xlmCodedClassicPayment),
    ).toBe(true);
  });

  it("does not file a classic payment under the native key", () => {
    expect(operationMatchesAssetKey("native", xlmCodedClassicPayment)).toBe(
      false,
    );
  });

  it("files a path payment with a native source under the native key", () => {
    expect(operationMatchesAssetKey("native", nativeSourcePathPayment)).toBe(
      true,
    );
  });

  it("does not file a path payment with a native source under a classic asset using the native code", () => {
    expect(
      operationMatchesAssetKey(XLM_CODED_KEY, nativeSourcePathPayment),
    ).toBe(false);
  });

  it("files a path payment under its own key when it is the source asset", () => {
    expect(
      operationMatchesAssetKey(XLM_CODED_KEY, xlmCodedSourcePathPayment),
    ).toBe(true);
  });

  it("does not file a path payment under the native key when only its source asset uses the native code", () => {
    expect(operationMatchesAssetKey("native", xlmCodedSourcePathPayment)).toBe(
      false,
    );
  });
});
