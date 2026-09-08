import BigNumber from "bignumber.js";
import { Networks } from "stellar-sdk";

import {
  amountToStroops,
  canPayFeeInXlm,
  isReserveNetwork,
  listFeeAssetOptions,
  feeRowAmount,
  maxSendStroopsForFee,
  nativeAvailableFromBalances,
  resolveFeeAsset,
  shouldOfferFeeAssetPicker,
  shouldUseReserve,
  withholdFeeFromSend,
} from "../reserve";
import { NATIVE_FEE_ASSET } from "../reserve/types";

const ISSUER = "GCKUFD5KAAM6DRSLODK55OVECMB5IJ5NSFQYFTBZRPOTJASUKTBZXGS2";
const USDC = `USDC:${ISSUER}`;
const EURC = `EURC:${ISSUER}`;

const balances = [
  {
    token: { type: "native" as const, code: "XLM" as const },
    available: new BigNumber("0"),
    total: new BigNumber("1.5"),
    buyingLiabilities: "0",
    sellingLiabilities: "0",
    minimumBalance: "1.5",
    blockaidData: {} as any,
  },
  {
    token: { type: "credit_alphanum4", code: "USDC", issuer: { key: ISSUER } },
    available: new BigNumber("12.5"),
    total: new BigNumber("12.5"),
    buyingLiabilities: "0",
    sellingLiabilities: "0",
    blockaidData: {} as any,
  },
  {
    token: { type: "credit_alphanum4", code: "EURC", issuer: { key: ISSUER } },
    available: new BigNumber("3"),
    total: new BigNumber("3"),
    buyingLiabilities: "0",
    sellingLiabilities: "0",
    blockaidData: {} as any,
  },
] as any;

describe("reserve fee assets", () => {
  it("offers reserve on Testnet and Public", () => {
    expect(isReserveNetwork(Networks.TESTNET)).toBe(true);
    expect(isReserveNetwork(Networks.PUBLIC)).toBe(true);
    expect(isReserveNetwork(Networks.FUTURENET)).toBe(false);
  });

  it("treats reserved XLM as unspendable for the fee", () => {
    expect(
      nativeAvailableFromBalances([
        {
          token: { type: "native", code: "XLM" },
          available: new BigNumber("1.5"),
          total: new BigNumber("1.5"),
          buyingLiabilities: "0",
          sellingLiabilities: "0",
          minimumBalance: "1.5",
          blockaidData: {} as any,
        },
      ] as any),
    ).toBe("0");
  });

  it("treats zero spendable XLM as unable to pay the native fee", () => {
    expect(
      canPayFeeInXlm({ nativeAvailable: "0", requiredFeeXlm: "0.00001" }),
    ).toBe(false);
    expect(
      canPayFeeInXlm({ nativeAvailable: "0.00001", requiredFeeXlm: "0.00001" }),
    ).toBe(true);
  });

  it("lists held tokens that the service accepts, and XLM only when it covers the fee", () => {
    const zeroXlm = listFeeAssetOptions({
      acceptedTokens: [USDC, EURC],
      balances,
      nativeAvailable: "0",
      requiredFeeXlm: "0.00001",
    });
    expect(zeroXlm.map((o) => o.asset)).toEqual([USDC, EURC]);

    const withXlm = listFeeAssetOptions({
      acceptedTokens: [USDC, EURC],
      balances,
      nativeAvailable: "2",
      requiredFeeXlm: "0.00001",
    });
    expect(withXlm.map((o) => o.asset)).toEqual([NATIVE_FEE_ASSET, USDC, EURC]);
  });

  it("does not list a token the service does not accept", () => {
    const options = listFeeAssetOptions({
      acceptedTokens: [USDC],
      balances,
      nativeAvailable: "0",
      requiredFeeXlm: "0.00001",
    });
    expect(options.map((o) => o.asset)).toEqual([USDC]);
  });

  it("keeps the user's pick when it is still valid", () => {
    const options = listFeeAssetOptions({
      acceptedTokens: [USDC, EURC],
      balances,
      nativeAvailable: "2",
      requiredFeeXlm: "0.00001",
    });
    expect(resolveFeeAsset({ options, current: EURC })).toBe(EURC);
  });

  it("falls back to XLM, then the first token, when the pick disappears", () => {
    const withXlm = listFeeAssetOptions({
      acceptedTokens: [USDC],
      balances,
      nativeAvailable: "2",
      requiredFeeXlm: "0.00001",
    });
    expect(resolveFeeAsset({ options: withXlm, current: EURC })).toBe(
      NATIVE_FEE_ASSET,
    );

    const tokensOnly = listFeeAssetOptions({
      acceptedTokens: [USDC],
      balances,
      nativeAvailable: "0",
      requiredFeeXlm: "0.00001",
    });
    expect(resolveFeeAsset({ options: tokensOnly, current: EURC })).toBe(USDC);
  });

  it("caps the fee spend and reserves the send amount when fee and send are the same token", () => {
    expect(
      maxSendStroopsForFee({
        feeAsset: USDC,
        feeTokenAvailable: "5",
        sendAsset: USDC,
        sendAmount: "4.9",
      }),
    ).toBe(BigInt(1000000));

    expect(
      maxSendStroopsForFee({
        feeAsset: USDC,
        feeTokenAvailable: "5",
        sendAsset: USDC,
        sendAmount: "5",
      }),
    ).toBe(BigInt(0));

    expect(amountToStroops("1")).toBe(BigInt(10000000));
  });

  it("withholds the fee cap from Max when the fee token is the send asset", () => {
    expect(
      withholdFeeFromSend({
        spendable: "24.6759848",
        feeAsset: USDC,
        sendAsset: USDC,
      }),
    ).toBe("23.6759848");
    expect(
      withholdFeeFromSend({
        spendable: "0.5",
        feeAsset: USDC,
        sendAsset: USDC,
      }),
    ).toBe("0.4999999");
    expect(
      withholdFeeFromSend({
        spendable: "24.6759848",
        feeAsset: USDC,
        sendAsset: "native",
      }),
    ).toBe("24.6759848");
  });

  it("quotes reserve when the user picked a token on a classic Testnet or Public payment", () => {
    expect(
      shouldUseReserve({
        feeAsset: USDC,
        networkPassphrase: Networks.TESTNET,
        isPathPayment: false,
        isCollectible: false,
      }),
    ).toBe(true);
    expect(
      shouldUseReserve({
        feeAsset: USDC,
        networkPassphrase: Networks.PUBLIC,
        isPathPayment: false,
        isCollectible: false,
      }),
    ).toBe(true);
    expect(
      shouldUseReserve({
        feeAsset: NATIVE_FEE_ASSET,
        networkPassphrase: Networks.TESTNET,
        isPathPayment: false,
        isCollectible: false,
      }),
    ).toBe(false);
    expect(
      shouldUseReserve({
        feeAsset: USDC,
        networkPassphrase: Networks.FUTURENET,
        isPathPayment: false,
        isCollectible: false,
      }),
    ).toBe(false);
    expect(
      shouldOfferFeeAssetPicker({
        isClassicPayment: true,
        isReserveReady: true,
      }),
    ).toBe(true);
    expect(
      shouldOfferFeeAssetPicker({
        isClassicPayment: false,
        isClassicSwap: true,
        isReserveReady: true,
      }),
    ).toBe(true);
  });

  it("names the fee amount once when the picker already shows the asset", () => {
    expect(
      feeRowAmount({
        reserveFee: { amount: "0.012", code: "USDC" },
        showPicker: true,
        nativeFee: "0.1",
      }),
    ).toBe("0.012");
    expect(
      feeRowAmount({
        reserveFee: { amount: "0.012", code: "USDC" },
        showPicker: false,
        nativeFee: "0.1",
      }),
    ).toBe("0.012 USDC");
    expect(
      feeRowAmount({
        reserveFee: null,
        showPicker: true,
        nativeFee: "0.1",
      }),
    ).toBeNull();
    expect(
      feeRowAmount({
        reserveFee: null,
        showPicker: false,
        nativeFee: "0.1",
      }),
    ).toBe("0.1 XLM");
  });
});
