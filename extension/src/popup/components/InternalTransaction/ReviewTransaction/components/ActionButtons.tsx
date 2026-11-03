import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon } from "@stellar/design-system";

interface ActionButtonsProps {
  isOnBlockaidPane: boolean;
  isMalicious: boolean;
  isRequiredMemoMissing: boolean;
  isValidatingMemo: boolean;
  onAddMemo?: () => void;
  /** Opens the transaction settings sheet; shown as a gear beside Cancel. */
  onEditSettings?: () => void;
  shouldShowTxWarning: boolean;
  onCancel: () => void;
  onConfirmTx: () => void;
  isSubmitDisabled: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  isOnBlockaidPane,
  isMalicious,
  isRequiredMemoMissing,
  isValidatingMemo,
  onAddMemo,
  onEditSettings,
  shouldShowTxWarning,
  onCancel,
  onConfirmTx,
  isSubmitDisabled,
}) => {
  const { t } = useTranslation();
  // Only the side-by-side layouts carry the gear, as on mobile.
  const settingsButton = onEditSettings ? (
    <div className="ReviewTx__Actions__Settings">
      <Button
        size="lg"
        isRounded
        variant="tertiary"
        aria-label={t("Settings")}
        data-testid="review-tx-settings-btn"
        onClick={(e) => {
          e.preventDefault();
          onEditSettings();
        }}
      >
        <Icon.Settings04 />
      </Button>
    </div>
  ) : null;

  // 1. Blockaid "Do not proceed" pane: Cancel (primary) and "Confirm anyway"
  // (text) which submits the transaction directly rather than returning to review.
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

  // 2. Memo required but missing (only when no security warnings): Cancel and Add Memo side by side
  if (
    isRequiredMemoMissing &&
    !isValidatingMemo &&
    onAddMemo &&
    !shouldShowTxWarning
  ) {
    return (
      <div className="ReviewTx__Actions__Row">
        {settingsButton}
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
      </div>
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

  // 4. Normal case: Cancel and Confirm side by side (mobile and the frames
  // use a plain "Confirm"; the summary above already says what is sent).
  return (
    <div className="ReviewTx__Actions__Row">
      {settingsButton}
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
        {t("Confirm")}
      </Button>
    </div>
  );
};
