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

interface SwapToFooterProps extends SwapToAction {
  /** Closes the view; the flagged footer's Cancel. */
  onCancel: () => void;
  isMalicious?: boolean;
  isSuspicious?: boolean;
}

/**
 * The detail view's footer when opened from a swap picker (Varial
 * 4827:103078 and 4837:104248): one filled "Swap to {code}" or "Swap from
 * {code}" pill that fills that side of the swap and returns to the amount
 * screen. `secondary` is the filled monochrome call to action in Varial;
 * `primary` is brand blue.
 *
 * A flagged destination gets Cancel plus a "Swap to {code} anyway" text
 * action instead, as mobile and the review screen's Blockaid pane do. A
 * source needs no warning: the account holds it.
 */
export const SwapToFooter = ({
  code,
  side,
  onSelect,
  onCancel,
  isMalicious = false,
  isSuspicious = false,
}: SwapToFooterProps) => {
  const { t } = useTranslation();
  const isFlagged = side === "to" && (isMalicious || isSuspicious);

  return (
    <div
      className="AssetDetail__actions-container AssetDetail__swap-to"
      data-testid="asset-detail-swap-to"
    >
      {isFlagged ? (
        <>
          <Button
            data-testid="asset-detail-swap-to-cancel"
            variant={isMalicious ? "destructive" : "secondary"}
            size="lg"
            isRounded
            isFullWidth
            onClick={onCancel}
          >
            {t("Cancel")}
          </Button>
          <button
            type="button"
            data-testid="asset-detail-swap-to-anyway"
            className={`AssetDetail__swap-to-anyway AssetDetail__swap-to-anyway--${
              isMalicious ? "error" : "default"
            }`}
            onClick={onSelect}
          >
            {t("Swap to {{code}} anyway", { code })}
          </button>
        </>
      ) : (
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
      )}
    </div>
  );
};
