import { Asset } from "stellar-sdk";

import {
  getBuiltTx,
  getPerOpBaseFee,
  getSwapTotalFee,
  getSwapErrorMessage,
  ERROR_TO_DISPLAY,
} from "../useSimulateSwapData";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";

jest.mock("@shared/api/helpers/stellarSdkServer", () => ({
  stellarSdkServer: () => ({
    loadAccount: async (pk: string) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Account } = require("stellar-sdk");
      return new Account(pk, "1");
    },
  }),
}));

const PUBLIC_KEY = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const baseOpData = {
  sourceAsset: Asset.native(),
  destAsset: new Asset("USDC", USDC_ISSUER),
  amount: "10",
  allowedSlippage: "2",
  destinationAmount: "9.5",
  path: [] as string[],
};

describe("getPerOpBaseFee", () => {
  it("divides total fee across ops in stroops", () => {
    // 0.0002 XLM total over 2 ops = 2000 stroops / 2 = 1000 stroops
    expect(getPerOpBaseFee("0.0002", 2)).toBe("1000");
  });

  it("clamps to the 100-stroop network minimum", () => {
    // 0.00001 XLM = 100 stroops over 2 ops = 50 -> clamped to 100
    expect(getPerOpBaseFee("0.00001", 2)).toBe("100");
  });

  it("returns the full total for a single op", () => {
    expect(getPerOpBaseFee("0.00001", 1)).toBe("100");
  });
});

describe("getSwapTotalFee", () => {
  it("scales the recommended default fee by op count (2 ops for a new trustline)", () => {
    expect(getSwapTotalFee({ recommendedFee: "0.001", opCount: 2 })).toBe(
      "0.002",
    );
  });

  it("leaves the recommended fee as-is for a single op", () => {
    expect(getSwapTotalFee({ recommendedFee: "0.001", opCount: 1 })).toBe(
      "0.001",
    );
  });

  it("honors a custom fee as the total regardless of op count", () => {
    expect(
      getSwapTotalFee({
        recommendedFee: "0.001",
        customFee: "0.005",
        opCount: 2,
      }),
    ).toBe("0.005");
  });

  it("passes through an empty recommended fee without producing NaN", () => {
    expect(getSwapTotalFee({ recommendedFee: "", opCount: 2 })).toBe("");
  });
});

describe("getBuiltTx", () => {
  it("builds a single pathPaymentStrictSend when not a new token", async () => {
    const builder = await getBuiltTx(
      PUBLIC_KEY,
      { ...baseOpData, destinationTokenDetails: null },
      "0.00001",
      180,
      TESTNET_NETWORK_DETAILS,
    );
    const tx = builder.build();
    const ops = tx.operations;
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe("pathPaymentStrictSend");
    expect(builder.baseFee).toBe("100"); // 1 op, full total
  });

  it("prepends changeTrust as op[0] for a new token", async () => {
    const builder = await getBuiltTx(
      PUBLIC_KEY,
      {
        ...baseOpData,
        destinationTokenDetails: {
          tokenCode: "USDC",
          requiresTrustline: true,
          decimals: 7,
          issuer: USDC_ISSUER,
        },
      },
      "0.0002",
      180,
      TESTNET_NETWORK_DETAILS,
    );
    const tx = builder.build();
    const ops = tx.operations;
    expect(ops).toHaveLength(2);
    expect(ops[0].type).toBe("changeTrust");
    expect(ops[1].type).toBe("pathPaymentStrictSend");
    expect(builder.baseFee).toBe("1000"); // 0.0002 XLM / 2 ops
  });

  it("throws when requiresTrustline but issuer is missing", async () => {
    await expect(
      getBuiltTx(
        PUBLIC_KEY,
        {
          ...baseOpData,
          destinationTokenDetails: {
            tokenCode: "USDC",
            requiresTrustline: true,
            decimals: 7,
          },
        },
        "0.0002",
        180,
        TESTNET_NETWORK_DETAILS,
      ),
    ).rejects.toThrow();
  });
});

const CONTRACT_ID = "CAZXEHTSQATVQVWDPWWDTFSY6CM764JD4MZ6HUVPO3QKS64QEEP4KJH7";
const CLASSIC_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

const classicAsset = { issuer: CLASSIC_ISSUER };
const contractAsset = { issuer: CONTRACT_ID };

describe("getSwapErrorMessage", () => {
  it("returns custom token error when source is a contract ID", () => {
    const result = getSwapErrorMessage(
      new Error("some error"),
      contractAsset,
      classicAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.CUSTOM_TOKEN_NOT_SUPPORTED);
  });

  it("returns custom token error when dest is a contract ID", () => {
    const result = getSwapErrorMessage(
      new Error("some error"),
      classicAsset,
      contractAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.CUSTOM_TOKEN_NOT_SUPPORTED);
  });

  it("returns custom token error when both are contract IDs", () => {
    const result = getSwapErrorMessage(
      new Error("some error"),
      contractAsset,
      contractAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.CUSTOM_TOKEN_NOT_SUPPORTED);
  });

  it("returns known error even when assets are contract IDs", () => {
    const result = getSwapErrorMessage(
      new Error(ERROR_TO_DISPLAY.NO_PATH_FOUND),
      contractAsset,
      classicAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.NO_PATH_FOUND);
  });

  it("returns known error message for classic assets", () => {
    const result = getSwapErrorMessage(
      new Error(ERROR_TO_DISPLAY.NO_PATH_FOUND),
      classicAsset,
      classicAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.NO_PATH_FOUND);
  });

  it("returns unknown error for unrecognized Error with classic assets", () => {
    const result = getSwapErrorMessage(
      new Error("something unexpected"),
      classicAsset,
      classicAsset,
    );
    expect(result).toBe(
      "We had an issue retrieving your transaction details. Please try again.",
    );
  });

  it("returns known error message for string errors with classic assets", () => {
    const result = getSwapErrorMessage(
      ERROR_TO_DISPLAY.NO_PATH_FOUND,
      classicAsset,
      classicAsset,
    );
    expect(result).toBe(ERROR_TO_DISPLAY.NO_PATH_FOUND);
  });

  it("returns unknown error for unrecognized string with classic assets", () => {
    const result = getSwapErrorMessage(
      "something unexpected",
      classicAsset,
      classicAsset,
    );
    expect(result).toBe(
      "We had an issue retrieving your transaction details. Please try again.",
    );
  });

  it("returns unknown error for non-Error non-string with classic assets", () => {
    const result = getSwapErrorMessage(42, classicAsset, classicAsset);
    expect(result).toBe(
      "We had an issue retrieving your transaction details. Please try again.",
    );
  });
});
