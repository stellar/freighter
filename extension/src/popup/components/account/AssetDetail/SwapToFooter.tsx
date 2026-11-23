import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@stellar/design-system";

/** What a detail view's Swap To does: the picker's own pick for the token. */
export interface SwapToAction {
  code: string;
  /** Which swap side the picker fills: "to" (destination) or "from" (source). */
  side: "to" | "from";
  onSelect: () => void;
}

/**
 * The detail view's footer when opened from a swap picker (Varial
 * 4827:103078 and 4837:104248): one filled "Swap to {code}" or "Swap from
 * {code}" pill that fills that side of the swap and returns to the amount
 * screen. `secondary` is the filled monochrome call to action in Varial;
 * `primary` is brand blue.
 */
export const SwapToFooter = ({ code, side, onSelect }: SwapToAction) => {
  const { t } = useTranslation();
  return (
    <div
      className="AssetDetail__actions-container"
      data-testid="asset-detail-swap-to"
    >
      <Button
        data-testid="asset-detail-swap-to-button"
        variant="secondary"
        size="lg"
        isRounded
        isFullWidth
        onClick={onSelect}
      >
        {side === "from"
          ? t("Swap from {{code}}", { code })
          : t("Swap to {{code}}", { code })}
      </Button>
    </div>
  );
};
