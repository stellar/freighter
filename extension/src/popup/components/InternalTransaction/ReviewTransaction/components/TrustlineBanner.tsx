import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

interface TrustlineBannerProps {
  tokenCode: string;
  onClick: () => void;
}

export const TrustlineBanner = ({
  tokenCode,
  onClick,
}: TrustlineBannerProps) => {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="ReviewTx__TrustlineBanner"
      data-testid="review-tx-trustline-banner"
      onClick={onClick}
    >
      <span className="ReviewTx__TrustlineBanner__Label">
        <Icon.AlertSquare />
        {t("This will add a trustline to {{code}}", { code: tokenCode })}
      </span>
      <Icon.ChevronRight />
    </button>
  );
};
