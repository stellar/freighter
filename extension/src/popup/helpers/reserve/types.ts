export type {
  KnownToken,
  Quote,
  QuotePayload,
  ReserveOp,
  ReserveRequest,
  SubmitResult,
} from "@cavos/reserve";

export const NATIVE_FEE_ASSET = "native";

export interface FeeAssetOption {
  asset: string;
  code: string;
  issuer: string;
  available: string;
}

export interface ReserveFeeDisplay {
  amount: string;
  code: string;
  asset: string;
}
