import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon } from "@stellar/design-system";

import { SlideupModal } from "popup/components/SlideupModal";

import "./styles.scss";

/** Color treatment for the top-left icon badge. */
export type InfoSheetBadgeVariant = "brand" | "neutral";

interface InfoSheetContentProps {
  /** Icon rendered inside the top-left badge. */
  icon: React.ReactNode;
  /** Badge color: "brand" (lilac) or "neutral" (gray). */
  badgeVariant?: InfoSheetBadgeVariant;
  title: string;
  /** Label for the full-width dismiss button (e.g. "Close", "Got it"). */
  actionLabel: string;
  onClose: () => void;
  children: React.ReactNode;
  "data-testid"?: string;
  /** Test id for the circular X close button. */
  closeTestId?: string;
}

/**
 * Presentational body of an informational sheet: a colored icon badge plus a
 * circular close button on top, a title and body, and a full-width dismiss
 * button. Modal-agnostic so it can be wrapped in a SlideupModal (see
 * InfoBottomSheet below) or rendered directly inside a review pane.
 */
export const InfoSheetContent = ({
  icon,
  badgeVariant = "brand",
  title,
  actionLabel,
  onClose,
  children,
  "data-testid": dataTestId,
  closeTestId,
}: InfoSheetContentProps) => {
  const { t } = useTranslation();
  return (
    <div className="InfoSheet" data-testid={dataTestId}>
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
      <Button
        className="InfoSheet__action"
        size="md"
        variant="secondary"
        isFullWidth
        onClick={onClose}
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
