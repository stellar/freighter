import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon } from "@stellar/design-system";

import { SlideupModal } from "popup/components/SlideupModal";

import "./styles.scss";

/** Color treatment for the top-left icon badge. */
export type InfoSheetBadgeVariant = "brand" | "neutral" | "error";

interface InfoSheetContentProps {
  /** Icon rendered inside the top-left badge. */
  icon: React.ReactNode;
  /** Badge color: "brand" (lilac), "neutral" (gray) or "error" (red, for
   * warnings about destructive actions). */
  badgeVariant?: InfoSheetBadgeVariant;
  title: string;
  /** Label for the full-width action button (e.g. "Close", "Got it"). */
  actionLabel: string;
  onClose: () => void;
  /** Runs when the action button is pressed. Defaults to `onClose`, which
   * makes the action a dismiss button. */
  onAction?: () => void;
  /** Action button variant; "destructive" renders it red. */
  actionVariant?: "secondary" | "destructive";
  /** Shows a spinner on the action button and disables it. */
  isActionLoading?: boolean;
  children: React.ReactNode;
  "data-testid"?: string;
  /** Test id for the circular X close button. */
  closeTestId?: string;
  /** Test id for the action button. */
  actionTestId?: string;
  /** Rendered in-flow (not in its own SlideupModal), e.g. inside the review
   * sheet. Drops the sheet's self-padding (the host already provides the
   * gutter) and matches the host's lg/rounded action button. */
  isInline?: boolean;
}

/**
 * Presentational body of an informational sheet: a colored icon badge plus a
 * circular close button on top, a title and body, and a full-width action
 * button (a dismiss button unless `onAction` is given).
 * Modal-agnostic so it can be wrapped in a SlideupModal (see InfoBottomSheet
 * below) or rendered directly inside a review pane.
 */
export const InfoSheetContent = ({
  icon,
  badgeVariant = "brand",
  title,
  actionLabel,
  onClose,
  onAction = onClose,
  actionVariant = "secondary",
  isActionLoading = false,
  children,
  "data-testid": dataTestId,
  closeTestId,
  actionTestId,
  isInline = false,
}: InfoSheetContentProps) => {
  const { t } = useTranslation();
  return (
    <div
      className={`InfoSheet${isInline ? " InfoSheet--inline" : ""}`}
      data-testid={dataTestId}
    >
      <div className="InfoSheet__top">
        <div className={`InfoSheet__badge InfoSheet__badge--${badgeVariant}`}>
          {icon}
        </div>
        <button
          type="button"
          className="InfoSheet__close"
          onClick={onClose}
          data-testid={closeTestId}
          aria-label={t("Close")}
        >
          <Icon.X />
        </button>
      </div>
      <div className="InfoSheet__text">
        <h2 className="InfoSheet__title">{title}</h2>
        <div className="InfoSheet__body">{children}</div>
      </div>
      {/* Do not pass a className to this Button. SDS Button does
          `className: \`Button ...\`, ...props`, so a passed className
          overwrites its own variant/size classes and the button renders as
          bare text. */}
      <Button
        size="lg"
        variant={actionVariant}
        isFullWidth
        isRounded
        onClick={onAction}
        isLoading={isActionLoading}
        disabled={isActionLoading}
        data-testid={actionTestId}
      >
        {actionLabel}
      </Button>
    </div>
  );
};

interface InfoBottomSheetProps extends InfoSheetContentProps {
  isOpen: boolean;
}

/** {@link InfoSheetContent} wrapped in a slide-up modal. */
export const InfoBottomSheet = ({
  isOpen,
  onClose,
  ...rest
}: InfoBottomSheetProps) => (
  <SlideupModal isModalOpen={isOpen} setIsModalOpen={() => onClose()}>
    <InfoSheetContent onClose={onClose} {...rest} />
  </SlideupModal>
);
