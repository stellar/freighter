import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import "./styles.scss";

/**
 * - `inline`: title and X on one row, title left-aligned.
 * - `stacked`: a top row with `leading` on the left and the X on the right,
 *   the title below it.
 * - `centered`: title centered, X (if any) on the right and `leading` (if any,
 *   e.g. a back arrow) on the left. `trailing` (e.g. a menu) takes the right
 *   instead of the X.
 */
export enum SheetHeaderLayout {
  Inline = "inline",
  Stacked = "stacked",
  Centered = "centered",
}

interface SheetHeaderProps {
  title?: React.ReactNode;
  /** Defaults to `stacked` when `leading` is given, `inline` otherwise. */
  layout?: SheetHeaderLayout;
  /** Rendered at the start of the stacked layout's top row (e.g. a settings
   * button). */
  leading?: React.ReactNode;
  /** Rendered on the right of the centered layout, where the X would go (e.g.
   * a menu when the X sits on the left as `leading`). */
  trailing?: React.ReactNode;
  /** Shows the X when given. */
  onClose?: () => void;
  closeTestId?: string;
  titleTestId?: string;
}

/**
 * The Varial sheet header, shared by every bottom sheet. Mirrors mobile's
 * `BottomSheetHeader`: a bare X (no circle) and no badge. Adds no spacing
 * below itself; `SheetLayout` owns the gap to the body.
 */
export const SheetHeader = ({
  title,
  layout,
  leading,
  trailing,
  onClose,
  closeTestId,
  titleTestId,
}: SheetHeaderProps) => {
  const { t } = useTranslation();

  if (!title && !leading && !trailing && !onClose) {
    return null;
  }

  const resolvedLayout =
    layout ?? (leading ? SheetHeaderLayout.Stacked : SheetHeaderLayout.Inline);

  const closeButton = onClose ? (
    <button
      type="button"
      className="SheetHeader__close"
      onClick={onClose}
      data-testid={closeTestId}
      aria-label={t("Close")}
    >
      <Icon.X />
    </button>
  ) : null;

  const titleElement = title ? (
    <h2 className="SheetHeader__title" data-testid={titleTestId}>
      {title}
    </h2>
  ) : null;

  if (resolvedLayout === SheetHeaderLayout.Stacked) {
    return (
      <div className="SheetHeader SheetHeader--stacked">
        {(leading || closeButton) && (
          <div className="SheetHeader__row">
            <div className="SheetHeader__leading">{leading}</div>
            {closeButton}
          </div>
        )}
        {titleElement}
      </div>
    );
  }

  return (
    <div className={`SheetHeader SheetHeader--${resolvedLayout}`}>
      {resolvedLayout === SheetHeaderLayout.Centered && leading && (
        <div className="SheetHeader__leading">{leading}</div>
      )}
      {titleElement}
      {resolvedLayout === SheetHeaderLayout.Centered && trailing ? (
        <div className="SheetHeader__trailing">{trailing}</div>
      ) : (
        closeButton
      )}
    </div>
  );
};

interface SheetHeaderActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  "aria-label": string;
  "data-testid"?: string;
}

/**
 * A plain icon button that sits in the header beside the X (settings, back).
 * Forwards its ref so a Radix trigger (`asChild`) can anchor to it.
 */
export const SheetHeaderAction = React.forwardRef<
  HTMLButtonElement,
  SheetHeaderActionProps
>(({ children, ...props }, ref) => (
  <button type="button" className="SheetHeader__action" ref={ref} {...props}>
    {children}
  </button>
));
SheetHeaderAction.displayName = "SheetHeaderAction";
