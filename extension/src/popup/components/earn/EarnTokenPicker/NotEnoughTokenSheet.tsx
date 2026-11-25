import React, { useState } from "react";
import { Button } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { EarnReceiveSheet } from "popup/components/earn/EarnReceiveSheet";
import { SheetHeader } from "popup/components/SheetHeader";
import { SheetLayout } from "popup/components/SheetLayout";
import { NotEnoughVariant } from "popup/constants/earn";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { trackEarnFundingActionSelected } from "popup/metrics/earn";

import { EarnTokenOption } from "./hooks/useGetEarnTokensData";

import "./NotEnoughTokenSheet.scss";

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
 * see `getNotEnoughVariant`. Buy opens Add Funds on the token, as on mobile,
 * which is where a Coinbase session that can't be opened is reported. Its X
 * returns to the token picker.
 */
export const NotEnoughTokenSheet = ({
  option,
  variant,
  onClose,
  onSwap,
}: NotEnoughTokenSheetProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Receive takes over this sheet, as on mobile; its back arrow returns here.
  const [isReceiving, setIsReceiving] = useState(false);

  const showBuy =
    variant === NotEnoughVariant.BUY_OR_TRANSFER ||
    variant === NotEnoughVariant.BUY_SWAP_OR_TRANSFER;
  const showSwap =
    variant === NotEnoughVariant.SWAP_OR_TRANSFER ||
    variant === NotEnoughVariant.BUY_SWAP_OR_TRANSFER;

  // The second sentence names the routes on offer.
  const nextStep = () => {
    if (showSwap && showBuy) {
      return t("Swap, buy or transfer {{code}} to continue.", {
        code: option.code,
      });
    }
    if (showSwap) {
      return t("Swap or transfer {{code}} to continue.", { code: option.code });
    }
    if (showBuy) {
      return t("Buy or transfer {{code}} to continue.", { code: option.code });
    }
    return t("Transfer {{code}} to continue.", { code: option.code });
  };

  const receiveLabel = t("Receive {{code}}", { code: option.code });

  const handleBuy = () => {
    trackEarnFundingActionSelected({ assetCode: option.code, action: "buy" });
    navigateTo(ROUTES.addFunds, navigate, `?token=${option.code}`);
  };
  const handleSwap = () => {
    trackEarnFundingActionSelected({ assetCode: option.code, action: "swap" });
    onSwap();
  };
  const handleReceive = () => {
    trackEarnFundingActionSelected({
      assetCode: option.code,
      action: "transfer",
    });
    setIsReceiving(true);
  };

  if (isReceiving) {
    return (
      <EarnReceiveSheet
        onBack={() => setIsReceiving(false)}
        onClose={onClose}
      />
    );
  }

  return (
    <SheetLayout data-testid="earn-not-enough-sheet">
      <div className="NotEnoughTokenSheet">
        <SheetHeader
          leading={
            <AssetIcon
              assetIcons={{
                [getCanonicalFromAsset(option.code, option.issuer)]:
                  option.iconUrl ?? null,
              }}
              code={option.code}
              issuerKey={option.issuer}
              icon={option.iconUrl || undefined}
            />
          }
          title={t("Not enough {{code}}", { code: option.code })}
          onClose={onClose}
          closeTestId="earn-not-enough-close"
        />

        {/* Two sentences on two lines, as the design breaks them. */}
        <div className="NotEnoughTokenSheet__body">
          <div>
            {t("Get {{code}} to deposit into this pool.", {
              code: option.code,
            })}
          </div>
          <div>{nextStep()}</div>
        </div>

        <div className="NotEnoughTokenSheet__actions">
          {showBuy && showSwap ? (
            <>
              <div className="NotEnoughTokenSheet__actions-row">
                <Button
                  size="lg"
                  variant="secondary"
                  isFullWidth
                  isRounded
                  onClick={handleSwap}
                  data-testid="earn-not-enough-swap"
                >
                  {t("Swap for {{code}}", { code: option.code })}
                </Button>
                <Button
                  size="lg"
                  variant="tertiary"
                  isFullWidth
                  isRounded
                  onClick={handleBuy}
                  data-testid="earn-not-enough-buy"
                >
                  {t("Buy {{code}}", { code: option.code })}
                </Button>
              </div>

              <div className="NotEnoughTokenSheet__or">
                <span>{t("or")}</span>
              </div>

              <button
                type="button"
                className="NotEnoughTokenSheet__text-action"
                onClick={handleReceive}
                data-testid="earn-not-enough-transfer"
              >
                {receiveLabel}
              </button>
            </>
          ) : (
            <>
              {showBuy && (
                <Button
                  size="lg"
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
                  size="lg"
                  variant="secondary"
                  isFullWidth
                  isRounded
                  onClick={handleSwap}
                  data-testid="earn-not-enough-swap"
                >
                  {t("Swap for {{code}}", { code: option.code })}
                </Button>
              )}

              {/* Outlined under a primary route; filled when receiving is the
                only thing the account can do. */}
              <Button
                size="lg"
                variant={showBuy || showSwap ? "tertiary" : "secondary"}
                isFullWidth
                isRounded
                onClick={handleReceive}
                data-testid="earn-not-enough-transfer"
              >
                {receiveLabel}
              </Button>
            </>
          )}
        </div>
      </div>
    </SheetLayout>
  );
};
