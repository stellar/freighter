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
});
