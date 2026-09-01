import React from "react";
import { Button, Icon, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { EARN_FLOW_QUERY } from "popup/constants/earn";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { useGetOnrampToken } from "helpers/hooks/useGetOnrampToken";

interface NetworkFeeSheetProps {
  onClose: () => void;
  /** Onramp is mainnet-only; elsewhere only the transfer route is offered. */
  canBuyXlm: boolean;
}

/**
 * Blocks review when the account cannot cover the transaction fee.
 *
 * A Soroban invoke's fee is always paid in XLM, so this fires regardless of
 * which asset is being deposited. Deliberately not the swap flow's
 * XlmReserveSheet: that one's copy is about funding a new trustline's reserve,
 * which a SupplyCollateral deposit never creates.
 */
export const NetworkFeeSheet = ({
  onClose,
  canBuyXlm,
}: NetworkFeeSheetProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { fetchData: openOnramp } = useGetOnrampToken({ asset: "XLM" });

  return (
    <div className="NetworkFeeSheet" data-testid="earn-network-fee-sheet">
      <div className="NetworkFeeSheet__header">
        <div className="NetworkFeeSheet__badge">
          <Icon.Coins03 />
        </div>
        <button
          type="button"
          className="NetworkFeeSheet__close"
          onClick={onClose}
          aria-label={t("Close")}
          data-testid="earn-network-fee-close"
        >
          <Icon.XClose />
        </button>
      </div>

      <Text as="h2" size="lg" weight="semi-bold">
        {t("You need some XLM for the network fee")}
      </Text>

      <div className="NetworkFeeSheet__body">
        <Text as="p" size="sm">
          {t("Add XLM to your wallet to continue")}
        </Text>
      </div>

      <div className="NetworkFeeSheet__actions">
        {canBuyXlm && (
          <Button
            size="md"
            variant="secondary"
            isFullWidth
            isRounded
            onClick={() => openOnramp()}
            data-testid="earn-network-fee-buy"
          >
            {t("Buy with Coinbase")}
          </Button>
        )}
        <Button
          size="md"
          variant="tertiary"
          isFullWidth
          isRounded
          onClick={() =>
            navigateTo(ROUTES.viewPublicKey, navigate, EARN_FLOW_QUERY)
          }
          data-testid="earn-network-fee-transfer"
        >
          {t("Transfer from another account")}
        </Button>
      </div>
    </div>
  );
};
