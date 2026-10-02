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
  // The children as of the last render while open, and the copy painted during
  // the slide-out. The parent is told the sheet closed immediately, so by then
  // it may already have swapped its children for a placeholder; most call sites
  // gate theirs on the same flag they pass as `isModalOpen`.
  const openChildren = useRef(children);
  const [exitingChildren, setExitingChildren] =
    useState<React.ReactElement | null>(null);
  // Held in state rather than a ref because the swap below happens *during*
  // render, and a ref mutated in render is not safe under StrictMode's double
  // invocation.
  const [prevIsModalOpen, setPrevIsModalOpen] = useState(isModalOpen);

  // Through a ref, and only while open: re-freezing on every child render
  // would fight the slide-out.
  useEffect(() => {
    if (isModalOpen) {
      openChildren.current = children;
    }
  });

  // Swapped in during the closing render, not from an effect afterwards.
  //
  // An effect runs after the commit, and by then the slot has already painted
  // the parent's closed-state placeholder and React has unmounted the real
  // child -- so assigning the frozen copy mounted a *second* instance just to
  // play the slide-out. That copy re-ran the child's data fetches (a visible
  // spinner and another Blockaid scan on the trustline sheet) and fired its
  // unmount effects all over again, which for `ChangeTrustInternal` meant a
  // spurious `signing.rejected` -- after a successful add, and twice on a
  // cancel.
  //
  // Assigning the very element React is already holding keeps type, key and
  // position identical, so the child reconciles in place and never unmounts.
  if (prevIsModalOpen !== isModalOpen) {
    setPrevIsModalOpen(isModalOpen);
    // Reopening mid-slide-out drops the frozen copy so the live children come
    // back; the effect below clears the pending timer.
    setExitingChildren(isModalOpen ? null : openChildren.current);
  }

  useEffect(() => {
    if (closeTimer.current !== null) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }

    setIsOpen(isModalOpen);

    if (isModalOpen) {
      return;
    }

    // Nulling the frozen copy is what finally lets a gated child unmount --
    // once, at the end of the animation rather than at its start. Mounting
    // already closed arms this too; it resolves to a no-op bail out.
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      setExitingChildren(null);
    }, SLIDEUP_MODAL_TRANSITION_MS);
  }, [isModalOpen]);

  // Tell the parent straight away and let the frozen children above cover the
  // slide-out. Deferring this call instead used to swallow a reopen: the
  // parent's flag was still `true`, so re-setting it to `true` was a no-op bail
  // out and the sheet never came back. Shared by the backdrop and Escape so the
  // two dismissals cannot drift apart.
  const closeWithTransition = useCallback(() => {
    setIsModalOpen(false);
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
        <div ref={contentRef}>{exitingChildren ?? children}</div>
      </div>
      <LoadingBackground onClick={closeWithTransition} isActive={isOpen} />
    </>
  );
};
