import { Asset } from "stellar-sdk";

import {
  getMinOut,
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

describe("getMinOut", () => {
  it.each([
    ["1.0000001", "1", "0.99"],
    ["100", "7", "93"],
    ["3", "0.7", "2.979"],
  ])("takes %s less %s%% exactly, rounded down", (toAmount, slip, minOut) => {
    expect(getMinOut(slip, toAmount, 7)).toBe(minOut);
  });

  it.each([
    ["2.345678", 6, "2.322221"],
    ["0.000000000000000123", 18, "0.000000000000000121"],
  ])("rounds %s down to %s decimals", (toAmount, decimals, minOut) => {
    expect(getMinOut("1", toAmount, decimals)).toBe(minOut);
  });
});

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
  it("builds a single pathPaymentStrictSend for a held destination", async () => {
    const builder = await getBuiltTx(
      PUBLIC_KEY,
      { ...baseOpData, requiresTrustline: false },
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

  it("prepends changeTrust as op[0] for an unheld destination", async () => {
    const builder = await getBuiltTx(
      PUBLIC_KEY,
      { ...baseOpData, requiresTrustline: true },
      "0.0002",
      180,
      TESTNET_NETWORK_DETAILS,
    );
    const tx = builder.build();
    const ops = tx.operations;
    expect(ops).toHaveLength(2);
    expect(ops[0].type).toBe("changeTrust");
    expect((ops[0] as { line: Asset }).line).toEqual(
      new Asset("USDC", USDC_ISSUER),
    );
    expect(ops[1].type).toBe("pathPaymentStrictSend");
    expect(builder.baseFee).toBe("1000"); // 0.0002 XLM / 2 ops
  });

  it("throws when requiresTrustline but the destination has no issuer", async () => {
    await expect(
      getBuiltTx(
        PUBLIC_KEY,
        {
          ...baseOpData,
          destAsset: Asset.native(),
          requiresTrustline: true,
        },
        "0.0002",
        180,
        TESTNET_NETWORK_DETAILS,
      ),
    ).rejects.toThrow();
  });
});

describe("getSwapErrorMessage", () => {
  it("returns a known error message", () => {
    expect(getSwapErrorMessage(new Error(ERROR_TO_DISPLAY.NO_QUOTE))).toBe(
      ERROR_TO_DISPLAY.NO_QUOTE,
    );
  });

  it("returns unknown error for unrecognized Error", () => {
    const result = getSwapErrorMessage(new Error("something unexpected"));
    expect(result).toBe(
      "We had an issue retrieving your transaction details. Please try again.",
    );
  });

  it("returns known error message for string errors", () => {
    const result = getSwapErrorMessage(ERROR_TO_DISPLAY.NO_QUOTE);
    expect(result).toBe(ERROR_TO_DISPLAY.NO_QUOTE);
  });

  it("returns unknown error for unrecognized string", () => {
    const result = getSwapErrorMessage("something unexpected");
    expect(result).toBe(
      "We had an issue retrieving your transaction details. Please try again.",
    );
  });

  it("returns unknown error for non-Error non-string", () => {
    const result = getSwapErrorMessage(42);
    expect(result).toBe(
      "We had an issue retrieving your transaction details. Please try again.",
    );
  });
});
