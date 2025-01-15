import { AssetVisibility, IssuerKey } from "@shared/api/types";

export const isAssetVisible = (
  hiddenAssets: Record<string, AssetVisibility>,
  issuer: IssuerKey,
) => !hiddenAssets[issuer] || hiddenAssets[issuer] === "visible";
