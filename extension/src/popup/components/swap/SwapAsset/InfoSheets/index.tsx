import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@stellar/design-system";

import { SlideupModal } from "popup/components/SlideupModal";

interface InfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerifiedTokenInfoSheet = ({ isOpen, onClose }: InfoSheetProps) => {
  const { t } = useTranslation();
  return (
    <SlideupModal isModalOpen={isOpen} setIsModalOpen={() => onClose()}>
      <div className="SwapInfoSheet" data-testid="verified-token-info-sheet">
        <h5>{t("Verified tokens")}</h5>
        <p>
          {t(
            "Freighter uses asset lists to verify assets before interactions.",
          )}
        </p>
        <Button
          size="md"
          variant="tertiary"
          isFullWidth
          onClick={() => onClose()}
        >
          {t("Got it")}
        </Button>
      </div>
    </SlideupModal>
  );
};

export const UnverifiedTokenInfoSheet = ({
  isOpen,
  onClose,
}: InfoSheetProps) => {
  const { t } = useTranslation();
  return (
    <SlideupModal isModalOpen={isOpen} setIsModalOpen={() => onClose()}>
      <div className="SwapInfoSheet" data-testid="unverified-token-info-sheet">
        <h5>{t("Unverified tokens")}</h5>
        <p>
          {t(
            "These tokens are not on any of your lists. Proceed with caution.",
          )}
        </p>
        <Button
          size="md"
          variant="tertiary"
          isFullWidth
          onClick={() => onClose()}
        >
          {t("Got it")}
        </Button>
      </div>
    </SlideupModal>
  );
};
