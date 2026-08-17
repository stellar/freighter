import React from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { AssetIcon } from "popup/components/account/AccountAssets";
import { ROUTES } from "popup/constants/routes";
import { NotEnoughVariant } from "popup/constants/earn";
import { navigateTo } from "popup/helpers/navigate";
import { useGetOnrampToken } from "helpers/hooks/useGetOnrampToken";

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

  return (
    <div className="NotEnoughTokenSheet" data-testid="earn-not-enough-sheet">
      <div className="NotEnoughTokenSheet__header">
        <AssetIcon
          assetIcons={option.iconUrl ? { [option.code]: option.iconUrl } : {}}
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
        {showBuy && (
          <Button
            size="md"
            variant="secondary"
            isFullWidth
            isRounded
            onClick={() => openOnramp()}
            data-testid="earn-not-enough-buy"
          >
            {showSwap
              ? t("Buy {{code}}", { code: option.code })
              : t("Buy with Coinbase")}
          </Button>
        )}

        {showSwap && (
          <Button
            size="md"
            variant={showBuy ? "tertiary" : "secondary"}
            isFullWidth
            isRounded
            onClick={onSwap}
            data-testid="earn-not-enough-swap"
          >
            {t("Swap for {{code}}", { code: option.code })}
          </Button>
        )}

        <Button
          size="md"
          variant="tertiary"
          isFullWidth
          isRounded
          onClick={() => navigateTo(ROUTES.viewPublicKey, navigate)}
          data-testid="earn-not-enough-transfer"
        >
          {t("Transfer from another account")}
        </Button>
      </div>
    </div>
  );
};
