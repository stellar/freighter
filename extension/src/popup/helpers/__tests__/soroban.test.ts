import { Asset, Networks } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { isAssetSac } from "popup/helpers/soroban";

const futurenetDetails = {
  network: "FUTURENET",
  networkPassphrase: Networks.FUTURENET,
} as NetworkDetails;

describe("isAssetSac", () => {
  it("recognises the native contract on a network the old table omitted", () => {
    expect(
      isAssetSac({
        asset: {
          code: "XLM",
          issuer: undefined,
          contract: Asset.native().contractId(Networks.FUTURENET),
        },
        networkDetails: futurenetDetails,
      }),
    ).toBe(true);
  });

  it("does not recognise an unrelated contract as the native one", () => {
    expect(
      isAssetSac({
        asset: {
          code: "XLM",
          issuer: undefined,
          contract: Asset.native().contractId(Networks.PUBLIC),
        },
        networkDetails: futurenetDetails,
      }),
    ).toBe(false);
  });
});
