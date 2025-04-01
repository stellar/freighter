import { AssetVisibility, IssuerKey } from "@shared/api/types";

export const isAssetVisible = (
  hiddenAssets: Record<string, AssetVisibility>,
  key: IssuerKey,
) => !hiddenAssets[key] || hiddenAssets[key] === "visible";
