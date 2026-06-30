import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { InfoBottomSheet } from "popup/components/InfoBottomSheet";

interface InfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Shared "Verified token" / "Unverified token" info sheets, used by both the
 * swap token picker and the add-a-token flow so the verified/unverified UX is
 * identical across flows.
 */
export const VerifiedTokenInfoSheet = ({ isOpen, onClose }: InfoSheetProps) => {
  const { t } = useTranslation();
  return (
    <InfoBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      data-testid="verified-token-info-sheet"
      badgeVariant="brand"
      icon={<Icon.CheckVerified01 />}
      title={t("Verified token")}
      actionLabel={t("Close")}
    >
      {t(
        "Freighter uses asset lists to verify assets before interactions. You can define your own assets lists in Settings.",
      )}
    </InfoBottomSheet>
  );
};

export const UnverifiedTokenInfoSheet = ({
  isOpen,
  onClose,
}: InfoSheetProps) => {
  const { t } = useTranslation();
  return (
    <InfoBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      data-testid="unverified-token-info-sheet"
      badgeVariant="neutral"
      icon={<Icon.CheckVerified01 />}
      title={t("Unverified token")}
      actionLabel={t("Close")}
    >
      {t(
        "These assets are not on any of your lists. Proceed with caution before adding.",
      )}
    </InfoBottomSheet>
  );
};
