import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

interface TrustlineInfoSheetProps {
  tokenCode: string;
  onClose: () => void;
}

export const TrustlineInfoSheet = ({
  tokenCode,
  onClose,
}: TrustlineInfoSheetProps) => {
  const { t } = useTranslation();
  return (
    <div className="ReviewTx__MemoDetails" data-testid="trustline-info-sheet">
      <div className="ReviewTx__MemoDetails__Header">
        <div className="ReviewTx__MemoDetails__Header__Icon">
          <Icon.Coins03 className="WarningMessage__icon" />
        </div>
        <div
          className="ReviewTx__MemoDetails__Header__Close"
          onClick={onClose}
          data-testid="trustline-info-sheet-close"
        >
          <Icon.X />
        </div>
      </div>
      <div className="ReviewTx__MemoDetails__Title">
        <span>{t("Adding a trustline to {{code}}", { code: tokenCode })}</span>
      </div>
      <div className="ReviewTx__MemoDetails__Content">
        <div className="ReviewTx__MemoDetails__Text">
          {t(
            "To hold a new asset, your account locks a one-time 0.5 XLM reserve for its trustline.",
          )}
        </div>
        <div className="ReviewTx__MemoDetails__Text">
          {t(
            "This reserve is refundable. Remove the trustline later to get it back.",
          )}
        </div>
      </div>
    </div>
  );
};
