import React from "react";
import { useTranslation } from "react-i18next";
import { Icon, Notification } from "@stellar/design-system";

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
    <div
      className="ReviewTx__TrustlineBanner"
      data-testid="review-tx-trustline-banner"
      onClick={onClick}
    >
      <Notification
        variant="primary"
        icon={<Icon.Coins03 />}
        title={t("This will add a trustline to {{code}}", { code: tokenCode })}
      >
        <div className="ReviewTx__TrustlineBanner__Action">
          <Icon.ChevronRight />
        </div>
      </Notification>
    </div>
  );
};
