import React from "react";
import { Button } from "@stellar/design-system";

import { SheetHeader, SheetHeaderLayout } from "popup/components/SheetHeader";
import { SheetLayout } from "popup/components/SheetLayout";
import { SlideupModal } from "popup/components/SlideupModal";

import "./styles.scss";

interface InfoSheetContentProps {
  title: string;
  /** `stacked` puts the X alone on the top row and the title below it (the
   * forgot-password sheet). */
  headerLayout?: SheetHeaderLayout;
  /** Label for the full-width action button (e.g. "Got it"). Omit it for a
   * sheet the X alone dismisses. */
  actionLabel?: string;
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
  /** Test id for the X. */
  closeTestId?: string;
  /** Test id for the action button. */
  actionTestId?: string;
  /** Rendered in-flow (not in its own SlideupModal), e.g. inside the review
   * sheet. Drops the sheet's self-padding (the host already provides the
   * gutter) and matches the host's lg/rounded action button. */
  isInline?: boolean;
}

/**
 * Presentational body of an informational sheet: the shared sheet header (a
 * title and a bare X), the body copy, and an optional full-width action button
 * (a dismiss button unless `onAction` is given).
 * Modal-agnostic so it can be wrapped in a SlideupModal (see InfoBottomSheet
 * below) or rendered directly inside a review pane.
 */
export const InfoSheetContent = ({
  title,
  headerLayout,
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
  const header = (
    <SheetHeader
      title={title}
      layout={headerLayout}
      onClose={onClose}
      closeTestId={closeTestId}
    />
  );
  // Do not pass a className to this Button. SDS Button does
  // `className: "Button ...", ...props`, so a passed className overwrites its
  // own variant/size classes and the button renders as bare text.
  const action = actionLabel ? (
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
  ) : null;
  const body = <div className="InfoSheet__body">{children}</div>;

  if (isInline) {
    return (
      <div className="InfoSheet InfoSheet--inline" data-testid={dataTestId}>
        {header}
        {body}
        {action}
      </div>
    );
  }

  return (
    <SheetLayout data-testid={dataTestId} header={header} footer={action}>
      {body}
    </SheetLayout>
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
  <SlideupModal
    isModalOpen={isOpen}
    setIsModalOpen={() => onClose()}
    // Every consumer already supplies a visible title, so naming the dialog
    // costs no new string and covers all of them at once.
    ariaLabel={rest.title}
  >
    <InfoSheetContent onClose={onClose} {...rest} />
  </SlideupModal>
);
