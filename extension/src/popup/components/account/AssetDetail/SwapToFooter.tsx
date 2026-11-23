import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@stellar/design-system";

/** What a detail view's Swap To does: the picker's own pick for the token. */
export interface SwapToAction {
  code: string;
  onSelect: () => void;
}

/**
 * The detail view's footer when opened from the swap picker (Varial
 * 4827:103078): one filled "Swap to {code}" pill that makes the token the
 * swap destination and returns to the amount screen. `secondary` is the
 * filled monochrome call to action in Varial; `primary` is brand blue.
 */
export const SwapToFooter = ({ code, onSelect }: SwapToAction) => {
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
        {t("Swap to {{code}}", { code })}
      </Button>
    </div>
  );
};
