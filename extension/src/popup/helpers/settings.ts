import { AssetVisibility, AssetKey } from "@shared/api/types";

export const isAssetVisible = (
  hiddenAssets: Record<string, AssetVisibility>,
  key: AssetKey,
) => !hiddenAssets[key] || hiddenAssets[key] === "visible";
