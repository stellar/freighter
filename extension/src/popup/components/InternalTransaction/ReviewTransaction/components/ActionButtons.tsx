import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@stellar/design-system";
import { Asset } from "stellar-sdk";

interface ActionButtonsProps {
  isOnBlockaidPane: boolean;
  isMalicious: boolean;
  isRequiredMemoMissing: boolean;
  isValidatingMemo: boolean;
  onAddMemo?: () => void;
  shouldShowTxWarning: boolean;
  onCancel: () => void;
  onConfirmTx: () => void;
  paneConfig: {
    reviewIndex: number;
  };
  isSubmitDisabled: boolean;
  dstAsset?: {
    canonical: string;
    amount: string;
  };
  dest: Asset | { code: string; issuer: string } | null;
  asset: Asset | { code: string; issuer: string };
  truncatedDest: string;
  setActivePaneIndex?: (index: number) => void;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isOnBlockaidPane,
  isMalicious,
  isRequiredMemoMissing,
  isValidatingMemo,
  onAddMemo,
  shouldShowTxWarning,
  onCancel,
  onConfirmTx,
  paneConfig,
  isSubmitDisabled,
  dstAsset,
  dest,
  asset,
  truncatedDest,
  setActivePaneIndex,
}) => {
  const { t } = useTranslation();

  // 1. Blockaid pane: Cancel (primary) and Continue (text) to proceed to review
  if (isOnBlockaidPane) {
    return (
      <>
        <Button
          size="lg"
          isFullWidth
          isRounded
          variant={isMalicious ? "destructive" : "secondary"}
          data-testid="CancelAction"
          onClick={(e) => {
            e.preventDefault();
            onCancel();
          }}
        >
          {t("Cancel")}
        </Button>
        <button
          type="button"
          className={`ReviewTx__TextAction ReviewTx__TextAction--${
            isMalicious ? "error" : "default"
          }`}
          data-testid="ContinueAction"
          onClick={(e) => {
            e.preventDefault();
            setActivePaneIndex?.(paneConfig.reviewIndex);
          }}
        >
          {t("Continue")}
        </button>
      </>
    );
  }

  // 2. Memo required but missing (only when no security warnings): Add Memo (primary) and Cancel (secondary)
  if (
    isRequiredMemoMissing &&
    !isValidatingMemo &&
    onAddMemo &&
    !shouldShowTxWarning
  ) {
    return (
      <>
        <Button
          size="lg"
          isFullWidth
          isRounded
          variant="secondary"
          data-testid="AddMemoAction"
          onClick={(e) => {
            e.preventDefault();
            onAddMemo();
          }}
        >
          {t("Add Memo")}
        </Button>
        <Button
          size="lg"
          isFullWidth
          isRounded
          variant="tertiary"
          disabled={isValidatingMemo}
          onClick={(e) => {
            e.preventDefault();
            onCancel();
          }}
        >
          {t("Cancel")}
        </Button>
      </>
    );
  }

  // 3. Transaction warnings acknowledged: Cancel (destructive for malicious, secondary otherwise) and "Confirm anyway" (text)
  if (shouldShowTxWarning) {
    return (
      <>
        <Button
          size="lg"
          isFullWidth
          isRounded
          variant={isMalicious ? "destructive" : "secondary"}
          data-testid="CancelAction"
          onClick={(e) => {
            e.preventDefault();
            onCancel();
          }}
        >
          {t("Cancel")}
        </Button>
        <button
          type="button"
          className={`ReviewTx__TextAction ReviewTx__TextAction--${
            isMalicious ? "error" : "default"
          }`}
          data-testid="SubmitAction"
          onClick={(e) => {
            e.preventDefault();
            onConfirmTx();
          }}
        >
          {t("Confirm anyway")}
        </button>
      </>
    );
  }

  // 4. Normal case: Confirm (primary) and Cancel (secondary)
  return (
    <>
      <Button
        size="lg"
        isFullWidth
        isRounded
        variant="secondary"
        data-testid="SubmitAction"
        disabled={isSubmitDisabled}
        isLoading={isValidatingMemo}
        onClick={(e) => {
          e.preventDefault();
          onConfirmTx();
        }}
      >
        {dstAsset && dest
          ? `Swap ${asset.code} to ${dest.code}`
          : `Send to ${truncatedDest}`}
      </Button>
      <Button
        size="lg"
        isFullWidth
        isRounded
        variant="tertiary"
        disabled={isValidatingMemo}
        onClick={(e) => {
          e.preventDefault();
          onCancel();
        }}
      >
        {t("Cancel")}
      </Button>
    </>
  );
};
