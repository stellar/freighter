import React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { InfoSheetContent } from "popup/components/InfoBottomSheet";

interface TrustlineInfoSheetProps {
  tokenCode: string;
  onClose: () => void;
}

/**
 * Trustline explanation rendered IN-FLOW (not a nested SlideupModal). It sits
 * inside the review sheet in place of the review body while open: nesting a
 * position:fixed SlideupModal inside the self-measuring review modal collapsed
 * the review modal's height and clipped the sheet down to just its action
 * button (§ batch3 task 4). In-flow content drives the modal's height, so it
 * renders full-size as the only visible sheet.
 */
export const TrustlineInfoSheet = ({
  tokenCode,
  onClose,
}: TrustlineInfoSheetProps) => {
  const { t } = useTranslation();
  return (
    <InfoSheetContent
      isInline
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
