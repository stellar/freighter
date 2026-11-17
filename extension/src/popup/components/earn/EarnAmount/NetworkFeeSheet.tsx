import React, { useState } from "react";
import { Button, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AssetIcon } from "popup/components/account/AccountAssets";
import { EarnReceiveSheet } from "popup/components/earn/EarnReceiveSheet";
import { useGetOnrampToken } from "helpers/hooks/useGetOnrampToken";

interface NetworkFeeSheetProps {
  onClose: () => void;
  /** Onramp is mainnet-only; elsewhere only receiving is offered. */
  canBuyXlm: boolean;
}

/**
 * Blocks review when the account cannot cover the transaction fee.
 *
 * A Soroban invoke's fee is always paid in XLM, so this fires regardless of
 * which asset is being deposited. Deliberately not the swap flow's
 * XlmReserveSheet: that one's copy is about funding a new trustline's reserve,
 * which a SupplyCollateral deposit never creates.
 *
 * Laid out like the "Not enough" sheet (Varial 4478:115952), whose styles it
 * shares.
 */
export const NetworkFeeSheet = ({
  onClose,
  canBuyXlm,
}: NetworkFeeSheetProps) => {
  const { t } = useTranslation();
  const { fetchData: openOnramp } = useGetOnrampToken({ asset: "XLM" });
  // Receive takes over this sheet, as on mobile; its back arrow returns here.
  const [isReceiving, setIsReceiving] = useState(false);

  if (isReceiving) {
    return (
      <EarnReceiveSheet
        onBack={() => setIsReceiving(false)}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="NotEnoughTokenSheet" data-testid="earn-network-fee-sheet">
      <div className="NotEnoughTokenSheet__header">
        <AssetIcon assetIcons={{}} code="XLM" issuerKey="" />
        <button
          type="button"
          className="NotEnoughTokenSheet__close"
          onClick={onClose}
          aria-label={t("Close")}
          data-testid="earn-network-fee-close"
        >
          <Icon.X />
        </button>
      </div>

      <h2 className="NotEnoughTokenSheet__title">
        {t("You need XLM to pay fees")}
      </h2>

      <div className="NotEnoughTokenSheet__body">
        {t(
          "You don’t have enough available XLM to cover the transaction fee. Add XLM to continue with your deposit.",
        )}
      </div>

      <div className="NotEnoughTokenSheet__actions">
        {canBuyXlm && (
          <Button
            size="lg"
            variant="secondary"
            isFullWidth
            isRounded
            onClick={() => openOnramp()}
            data-testid="earn-network-fee-buy"
          >
            {t("Buy with Coinbase")}
          </Button>
        )}
        {/* Outlined under Buy; filled when it is the only way to add XLM. */}
        <Button
          size="lg"
          variant={canBuyXlm ? "tertiary" : "secondary"}
          isFullWidth
          isRounded
          onClick={() => setIsReceiving(true)}
          data-testid="earn-network-fee-transfer"
        >
          {t("Receive {{code}}", { code: "XLM" })}
        </Button>
      </div>
    </div>
  );
};
