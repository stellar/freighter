import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { InfoSheetContent } from "popup/components/InfoBottomSheet";

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
    <InfoSheetContent
      data-testid="trustline-info-sheet"
      closeTestId="trustline-info-sheet-close"
      badgeVariant="brand"
      icon={<Icon.PlusCircle />}
      title={t("This will add a trustline to {{code}}", { code: tokenCode })}
      actionLabel={t("Got it")}
      onClose={onClose}
    >
      <Trans
        i18nKey="To hold {{code}} in your wallet, Stellar requires a trustline. <bold>0.5 XLM will be reserved</bold> from your balance. You can get it back by removing the trustline after your {{code}} balance is zero."
        values={{ code: tokenCode }}
        components={{ bold: <strong className="InfoSheet__emphasis" /> }}
      />
    </InfoSheetContent>
  );
};
