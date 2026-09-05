import BigNumber from "bignumber.js";
import { Asset, Networks } from "stellar-sdk";

import { AssetType } from "@shared/api/types/account-balance";
import { NetworkDetails } from "@shared/constants/stellar";
import { getBalanceByKey } from "popup/helpers/balance";

const XLM_CODED_ISSUER =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const networkDetails = {
  network: "PUBLIC",
  networkPassphrase: Networks.PUBLIC,
} as NetworkDetails;

const amounts = {
  total: new BigNumber("100"),
  available: new BigNumber("100"),
  buyingLiabilities: "0",
  sellingLiabilities: "0",
  blockaidData: {},
};

const nativeBalance = {
  ...amounts,
  token: { type: "native", code: "XLM" },
  minimumBalance: "1",
} as unknown as AssetType;

// A classic asset using the native code. It sorts first in the list below, so
// a lookup that enters the native branch on the code alone reaches it first.
const xlmCodedClassicBalance = {
  ...amounts,
  token: {
    type: "credit_alphanum4",
    code: "XLM",
    issuer: { key: XLM_CODED_ISSUER },
  },
} as unknown as AssetType;

const balances = [xlmCodedClassicBalance, nativeBalance];

describe("getBalanceByKey", () => {
  it("resolves the native SAC to the native balance", () => {
    const nativeSac = Asset.native().contractId(Networks.PUBLIC);

    expect(getBalanceByKey(nativeSac, balances, networkDetails)).toBe(
      nativeBalance,
    );
  });

  it("resolves a classic asset's own SAC to that asset's balance", () => {
    const wrappedSac = new Asset("XLM", XLM_CODED_ISSUER).contractId(
      Networks.PUBLIC,
    );

    expect(getBalanceByKey(wrappedSac, balances, networkDetails)).toBe(
      xlmCodedClassicBalance,
    );
  });
});
