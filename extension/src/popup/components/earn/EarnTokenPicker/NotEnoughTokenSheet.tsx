import React from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { ROUTES } from "popup/constants/routes";
import { EARN_FLOW_QUERY, NotEnoughVariant } from "popup/constants/earn";
import { navigateTo } from "popup/helpers/navigate";
import { useGetOnrampToken } from "helpers/hooks/useGetOnrampToken";
import { trackEarnFundingActionSelected } from "popup/metrics/earn";

import { EarnTokenOption } from "./hooks/useGetEarnTokensData";

interface NotEnoughTokenSheetProps {
  option: EarnTokenOption;
  variant: NotEnoughVariant;
  onClose: () => void;
  onSwap: () => void;
}

/**
 * Shown when a pool-supported token the account holds none of is tapped.
 *
 * Which actions appear depends on what is actually possible for this asset —
 * see `getNotEnoughVariant`. Buy opens the Coinbase onramp in a tab rather than
 * routing to Add Funds, which would abandon the Earn flow.
 */
export const NotEnoughTokenSheet = ({
  option,
  variant,
  onClose,
  onSwap,
}: NotEnoughTokenSheetProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchData: openOnramp } = useGetOnrampToken({ asset: option.code });

  const showBuy =
    variant === NotEnoughVariant.BUY_OR_TRANSFER ||
    variant === NotEnoughVariant.BUY_SWAP_OR_TRANSFER;
  const showSwap =
    variant === NotEnoughVariant.SWAP_OR_TRANSFER ||
    variant === NotEnoughVariant.BUY_SWAP_OR_TRANSFER;

  // The copy names only the routes actually offered, so it never points at an
  // action the sheet does not show.
  const body = () => {
    if (showBuy && showSwap) {
      return t(
        "You’ll need {{code}} to deposit into this pool. Buy or swap for {{code}} to continue.",
        { code: option.code },
      );
    }
    if (showBuy) {
      return t(
        "You’ll need {{code}} to deposit into this pool. Buy or transfer {{code}} to continue.",
        { code: option.code },
      );
    }
    if (showSwap) {
      return t(
        "You’ll need {{code}} to deposit into this pool. Swap or transfer {{code}} to continue.",
        { code: option.code },
      );
    }
    return t(
      "You’ll need {{code}} to deposit into this pool. Transfer {{code}} to continue.",
      { code: option.code },
    );
  };

  // Two routes of equal weight get the side-by-side treatment in the design,
  // with the transfer route demoted to a text button under an "or". A single
  // route keeps the stacked full-width pair.
  const showBothPrimaries = showBuy && showSwap;
  const transferLabel = t("Transfer from another account");

  // Each route reports itself before it leaves: Buy opens a tab, Transfer
  // navigates away, and Swap replaces the sheet, so this is the last frame in
  // which the choice is still attributable to the Earn funnel.
  const handleBuy = () => {
    trackEarnFundingActionSelected({ assetCode: option.code, action: "buy" });
    openOnramp();
  };
  const handleSwap = () => {
    trackEarnFundingActionSelected({ assetCode: option.code, action: "swap" });
    onSwap();
  };
  const goToTransfer = () => {
    trackEarnFundingActionSelected({
      assetCode: option.code,
      action: "transfer",
    });
    navigateTo(ROUTES.viewPublicKey, navigate, EARN_FLOW_QUERY);
  };

  return (
    <div className="NotEnoughTokenSheet" data-testid="earn-not-enough-sheet">
      <div className="NotEnoughTokenSheet__header">
        <AssetIcon
          // Keyed by canonical, which is how AssetIcon looks an asset up, and
          // always populated: an empty map reads as "still fetching" there, so a
          // token whose icon never resolved would spin instead of falling back.
          assetIcons={{
            [getCanonicalFromAsset(option.code, option.issuer)]:
              option.iconUrl ?? null,
          }}
          code={option.code}
          issuerKey={option.issuer}
          icon={option.iconUrl || undefined}
        />
        <button
          type="button"
          className="NotEnoughTokenSheet__close"
          onClick={onClose}
          aria-label={t("Close")}
          data-testid="earn-not-enough-close"
        >
          <Icon.XClose />
        </button>
      </div>

      <div className="NotEnoughTokenSheet__title">
        <Text as="h2" size="lg" weight="semi-bold">
          {t("Not enough {{code}}", { code: option.code })}
        </Text>
      </div>

      <div className="NotEnoughTokenSheet__body">
        <Text as="p" size="sm">
          {body()}
        </Text>
      </div>

      <div className="NotEnoughTokenSheet__actions">
        {showBothPrimaries ? (
          <>
            <div className="NotEnoughTokenSheet__actions-row">
              <Button
                size="md"
                variant="secondary"
                isFullWidth
                isRounded
                onClick={handleBuy}
                data-testid="earn-not-enough-buy"
              >
                {t("Buy {{code}}", { code: option.code })}
              </Button>
              <Button
                size="md"
                variant="secondary"
                isFullWidth
                isRounded
                onClick={handleSwap}
                data-testid="earn-not-enough-swap"
              >
                {t("Swap for {{code}}", { code: option.code })}
              </Button>
            </div>

            <div className="NotEnoughTokenSheet__or">
              <span>{t("or")}</span>
            </div>

            <button
              type="button"
              className="NotEnoughTokenSheet__text-action"
              onClick={goToTransfer}
              data-testid="earn-not-enough-transfer"
            >
              {transferLabel}
            </button>
          </>
        ) : (
          <>
            {showBuy && (
              <Button
                size="md"
                variant="secondary"
                isFullWidth
                isRounded
                onClick={handleBuy}
                data-testid="earn-not-enough-buy"
              >
                {t("Buy with Coinbase")}
              </Button>
            )}

            {showSwap && (
              <Button
                size="md"
                variant="secondary"
                isFullWidth
                isRounded
                onClick={handleSwap}
                data-testid="earn-not-enough-swap"
              >
                {t("Swap for {{code}}", { code: option.code })}
              </Button>
            )}

            {/* Outlined under a primary route; filled when transferring is the
                only thing the account can do. */}
            <Button
              size="md"
              variant={showBuy || showSwap ? "tertiary" : "secondary"}
              isFullWidth
              isRounded
              onClick={goToTransfer}
              data-testid="earn-not-enough-transfer"
            >
              {transferLabel}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
