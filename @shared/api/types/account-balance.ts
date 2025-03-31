import Blockaid from "@blockaid/client";
import BigNumber from "bignumber.js";
import { AssetType as SdkAssetType, Horizon } from "stellar-sdk";

export interface NativeAsset {
  token: {
    type: SdkAssetType.native;
    code: "XLM";
  };
  available: BigNumber;
  total: BigNumber;
  buyingLiabilities: string;
  sellingLiabilities: string;
  blockaidData: Blockaid.TokenScanResponse;
}

export interface ClassicAsset {
  token: {
    type: Omit<SdkAssetType, "native">;
    code: string;
    issuer: { key: string };
  };
  available: BigNumber;
  total: BigNumber;
  buyingLiabilities: string;
  sellingLiabilities: string;
  blockaidData: Blockaid.TokenScanResponse;
}

export interface SorobanAsset {
  token: { code: string; issuer: { key: string } };
  contractId: string;
  total: BigNumber;
  name: string;
  symbol: string;
  decimals: number;
}

export interface LiquidityPoolShareAsset {
  available: BigNumber;
  total: BigNumber;
  liquidityPoolId: string;
  reserves: Horizon.HorizonApi.Reserve[];
  limit: string;
}

export type AssetType =
  | NativeAsset
  | ClassicAsset
  | SorobanAsset
  | LiquidityPoolShareAsset;

export interface AccountBalances {
  balances: AssetType[];
  isFunded: boolean | null;
  subentryCount: number;
  error?: { horizon: any; soroban: any };
  icons?: { [code: string]: string };
}
