import React, { useRef, useEffect, useState, useCallback } from "react";

import { LoadingBackground } from "popup/basics/LoadingBackground";

import "./styles.scss";

export const SLIDEUP_MODAL_TRANSITION_MS = 200;

interface SlideupModalProps {
  children: React.ReactElement;
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
  /**
   * Names the dialog for screen readers. Sheets that render their own visible
   * title should pass that same string.
   */
  ariaLabel?: string;
}

/**
 * A floating bottom sheet: inset from the left, right and bottom edges, rounded
 * on all four corners. Sizes itself to its content via a ResizeObserver, up to
 * `--slideup-modal--max-height`, past which it scrolls internally.
 *
 * Carries dialog semantics, Escape-to-close and focus restoration, but *not* a
 * focus trap: tabbing can still reach the page behind it. Trapping means either
 * hand-rolling one or rebuilding on `@radix-ui/react-dialog`, whose portal
 * would move the card out of the sibling position the backdrop's
 * `.SlideupModal + .LoadingBackground--active` rule depends on.
 *
 * Do NOT nest a SlideupModal inside a SlideupModal. `will-change: transform`
 * makes this element a containing block for `position: fixed` descendants, so a
 * nested sheet is positioned and clipped against *this* card rather than the
 * viewport -- and because it is out of flow it contributes nothing to the
 * `scrollHeight` measured below, collapsing the parent to whatever in-flow
 * content remains. Render the inner content in flow instead; see
 * `InternalTransaction/ReviewTransaction/components/TrustlineInfoSheet.tsx`,
 * which uses `InfoSheetContent` directly for exactly this reason.
 */
export const SlideupModal = ({
  children,
  isModalOpen,
  setIsModalOpen,
  ariaLabel,
}: SlideupModalProps) => {
  const slideupModalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Whatever had focus when the sheet opened, so Escape and the backdrop can
  // put it back rather than dropping focus onto <body>.
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [isOpen, setIsOpen] = useState(isModalOpen);
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    undefined,
  );

  useEffect(() => {
    setIsOpen(isModalOpen);
  }, [isModalOpen]);

  // Slide out first, then tell the parent. Shared by the backdrop and Escape so
  // the two dismissals cannot drift apart.
  const closeWithTransition = useCallback(() => {
    setIsOpen(false);
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
    }
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setIsModalOpen(false);
    }, SLIDEUP_MODAL_TRANSITION_MS);
  }, [setIsModalOpen]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) {
        clearTimeout(closeTimer.current);
      }
    },
    [],
  );

  const updateHeight = useCallback(() => {
    if (contentRef.current) {
      // `scrollHeight` rounds to an integer and can land a pixel short. That
      // used to be invisible against a flush bottom edge; on a floating card
      // it clips the rounded bottom corners. The fractional rect catches it.
      // (getBoundingClientRect is transform-aware, but the only ancestor
      // transform here is a translateY -- don't add a scale.)
      const el = contentRef.current;
      setContentHeight(
        Math.ceil(Math.max(el.scrollHeight, el.getBoundingClientRect().height)),
      );
    }
  }, []);

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(contentEl);
    updateHeight();

    return () => {
      observer.disconnect();
    };
  }, [updateHeight]);

  useEffect(() => {
    if (!isOpen) {
      setContentHeight(undefined);
    }
  }, [isOpen]);

  // Only an open sheet listens. Screens mount several of these at once
  // (AssetDetail mounts three), and a closed one reacting to Escape would
  // dismiss on behalf of whichever sheet is actually open.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeWithTransition();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, closeWithTransition]);

  // Focus the card rather than the first control inside it: a container with no
  // outline moves the screen reader without painting a focus ring, which would
  // be a visible change on every sheet in the app.
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      slideupModalRef.current?.focus();
      return;
    }

    const toRestore = previouslyFocused.current;
    previouslyFocused.current = null;
    if (toRestore?.isConnected) {
      toRestore.focus();
    }
  }, [isOpen]);

  return (
    <>
      <div
        className={`SlideupModal ${isOpen ? "open" : "closed"}`}
        ref={slideupModalRef}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        tabIndex={-1}
        style={
          contentHeight !== undefined ? { height: `${contentHeight}px` } : {}
        }
      >
        <div ref={contentRef}>{children}</div>
      </div>
      <LoadingBackground onClick={closeWithTransition} isActive={isOpen} />
    </>
  );
};
