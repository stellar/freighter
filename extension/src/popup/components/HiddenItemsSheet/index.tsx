import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon } from "@stellar/design-system";

import { Sheet, SheetContent, SheetTitle } from "popup/basics/shadcn/Sheet";

import "./styles.scss";

interface HiddenItemsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Shown in place of the rows when nothing is hidden */
  emptyText: string;
  /** One element per hidden item; an empty list renders the empty state */
  rows: React.ReactNode[];
  "data-testid"?: string;
}

/**
 * Bottom sheet shared by the Hidden tokens and Hidden collectibles lists: a
 * title with a close icon, one row per hidden item (each with its own Unhide
 * button), an empty state, and a Close button. Slides up over the current
 * screen rather than replacing it.
 *
 * Built on the Radix dialog so it carries the dialog role and its title,
 * keeps keyboard focus inside while open, restores it to the opener on
 * close, and closes on Escape or a backdrop click.
 */
export const HiddenItemsSheet = ({
  isOpen,
  onClose,
  title,
  emptyText,
  rows,
  "data-testid": dataTestId = "hidden-items-sheet",
}: HiddenItemsSheetProps) => {
  const { t } = useTranslation();
  // The dialog only hands focus back to its own Trigger, and this sheet is
  // opened from a prop instead, so remember the opener ourselves.
  const openerRef = useRef<HTMLElement | null>(null);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="HiddenItemsSheet__content"
        aria-describedby={undefined}
        onOpenAutoFocus={() => {
          openerRef.current = document.activeElement as HTMLElement | null;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          openerRef.current?.focus();
        }}
      >
        <div className="HiddenItemsSheet" data-testid={dataTestId}>
          <div className="HiddenItemsSheet__top">
            <SheetTitle className="HiddenItemsSheet__title">{title}</SheetTitle>
            <button
              type="button"
              className="HiddenItemsSheet__close"
              onClick={onClose}
              aria-label={t("Close")}
              data-testid={`${dataTestId}-close`}
            >
              <Icon.X />
            </button>
          </div>
          {rows.length ? (
            <div className="HiddenItemsSheet__list">{rows}</div>
          ) : (
            <div
              className="HiddenItemsSheet__empty"
              data-testid={`${dataTestId}-empty`}
            >
              {emptyText}
            </div>
          )}
          {/* No className on this Button: SDS Button would drop its own
              variant/size classes. */}
          <Button
            size="lg"
            variant="secondary"
            isFullWidth
            isRounded
            type="button"
            onClick={onClose}
            data-testid={`${dataTestId}-close-button`}
          >
            {t("Close")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
