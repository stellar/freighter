import React, { useRef, useEffect, useState, useCallback } from "react";

import { LoadingBackground } from "popup/basics/LoadingBackground";

import "./styles.scss";

export const SLIDEUP_MODAL_TRANSITION_MS = 200;

interface SlideupModalProps {
  children: React.ReactElement;
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
}

/**
 * A floating bottom sheet: inset from the left, right and bottom edges, rounded
 * on all four corners. Sizes itself to its content via a ResizeObserver, up to
 * `--slideup-modal--max-height`, past which it scrolls internally.
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
}: SlideupModalProps) => {
  const slideupModalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(isModalOpen);
  const [contentHeight, setContentHeight] = useState<number | undefined>(
    undefined,
  );

  useEffect(() => {
    setIsOpen(isModalOpen);
  }, [isModalOpen]);

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

  return (
    <>
      <div
        className={`SlideupModal ${isOpen ? "open" : "closed"}`}
        ref={slideupModalRef}
        style={
          contentHeight !== undefined ? { height: `${contentHeight}px` } : {}
        }
      >
        <div ref={contentRef}>{children}</div>
      </div>
      <LoadingBackground
        onClick={() => {
          setIsOpen(false);
          setTimeout(() => {
            setIsModalOpen(false);
          }, SLIDEUP_MODAL_TRANSITION_MS);
        }}
        isActive={isOpen}
      />
    </>
  );
};
