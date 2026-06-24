import * as StellarSdk from "stellar-sdk";

import { buildChangeTrustOperation } from "../getManageAssetXDR";

describe("buildChangeTrustOperation", () => {
  const assetCode = "USDC";
  const assetIssuer =
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

  it("builds an add-trustline changeTrust op with no explicit limit", () => {
    const xdrOp = buildChangeTrustOperation({
      assetCode,
      assetIssuer,
      sdk: StellarSdk,
    });
    // Decode the XDR operation to verify its semantic content
    const op = StellarSdk.Operation.fromXDRObject(xdrOp);
    expect(op.type).toBe("changeTrust");
    // add-trustline: no explicit limit passed — SDK defaults to max trustline
    expect((op as any).line.code).toBe(assetCode);
    expect((op as any).line.issuer).toBe(assetIssuer);
    // limit should be the SDK max (not "0"), meaning no cap was set
    expect((op as any).limit).not.toBe("0");
  });

  it("builds a remove-trustline changeTrust op with limit 0", () => {
    const xdrOp = buildChangeTrustOperation({
      assetCode,
      assetIssuer,
      isRemove: true,
      sdk: StellarSdk,
    });
    const op = StellarSdk.Operation.fromXDRObject(xdrOp);
    expect(op.type).toBe("changeTrust");
    // SDK decodes limit "0" as "0.0000000" (7 decimal places)
    expect(parseFloat((op as any).limit)).toBe(0);
  });
});
