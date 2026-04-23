import React, { useRef, useEffect, useState, useCallback } from "react";

import { LoadingBackground } from "popup/basics/LoadingBackground";

import "./styles.scss";

export const SLIDEUP_MODAL_TRANSITION_MS = 200;

interface SlideupModalProps {
  children: React.ReactElement;
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
  hasBackdrop?: boolean;
}

export const SlideupModal = ({
  children,
  isModalOpen,
  setIsModalOpen,
  hasBackdrop = false,
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
      setContentHeight(contentRef.current.scrollHeight);
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
        isFullScreen={hasBackdrop}
      />
    </>
  );
};
