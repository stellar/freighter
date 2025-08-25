import {
  AssetType,
  LiquidityPoolShareAsset,
} from "@shared/api/types/account-balance";
import BigNumber from "bignumber.js";

export enum AMOUNT_ERROR {
  TOO_HIGH = "amount too high",
  DEC_MAX = "too many decimal digits",
  SEND_MAX = "amount higher than send max",
}

export type InputType = "crypto" | "fiat";

export const computeDestMinWithSlippage = (
  slippage: string,
  destMin: string,
): BigNumber => {
  const mult = 1 - parseFloat(slippage) / 100;
  return new BigNumber(destMin).times(new BigNumber(mult));
};

export const title = (balance: Exclude<AssetType, LiquidityPoolShareAsset>) => {
  if ("type" in balance.token && balance.token.type === "native") {
    return "XLM";
  }
  if ("symbol" in balance) {
    return balance.symbol;
  }

  return balance.token.code;
};
