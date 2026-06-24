import React from "react";
import { useTranslation } from "react-i18next";
import { Button, CopyText, Icon, Text } from "@stellar/design-system";

import { openTab } from "popup/helpers/navigate";

import "./styles.scss";

interface XlmReserveSheetProps {
  canSwapForReserve: boolean;
  onSwapForReserve?: () => void;
  publicKey: string;
  helpUrl: string;
  onClose: () => void;
}

export const XlmReserveSheet = ({
  canSwapForReserve,
  onSwapForReserve,
  publicKey,
  helpUrl,
  onClose,
}: XlmReserveSheetProps) => {
  const { t } = useTranslation();

  return (
    <div className="XlmReserveSheet" data-testid="XlmReserveSheet">
      <div className="XlmReserveSheet__header">
        <Text as="h2" size="md" weight="medium">
          {t("You need XLM to create a trustline")}
        </Text>
        <Text as="p" size="sm">
          {t(
            "Adding a trustline locks a one-time 0.5 XLM reserve in your account. You can recover it later by removing the trustline.",
          )}
        </Text>
      </div>

      <div className="XlmReserveSheet__actions">
        {canSwapForReserve ? (
          <Button
            size="md"
            variant="secondary"
            isFullWidth
            data-testid="XlmReserveSheet__swap-for-reserve"
            onClick={() => {
              onSwapForReserve?.();
              onClose();
            }}
          >
            {t("Swap for 0.5 XLM")}
          </Button>
        ) : null}

        <CopyText textToCopy={publicKey}>
          <Button
            size="md"
            variant="tertiary"
            isFullWidth
            icon={<Icon.Copy01 />}
            iconPosition="left"
            data-testid="XlmReserveSheet__copy-address"
          >
            {t("Copy my wallet address")}
          </Button>
        </CopyText>

        <Button
          size="md"
          variant="tertiary"
          isFullWidth
          data-testid="XlmReserveSheet__why-xlm"
          onClick={() => openTab(helpUrl)}
        >
          {t("Why do I need XLM?")}
        </Button>
      </div>
    </div>
  );
};
