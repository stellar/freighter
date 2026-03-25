import React, { useRef, useEffect, useState, useCallback } from "react";

import { LoadingBackground } from "popup/basics/LoadingBackground";

import "./styles.scss";

interface SlideupModalProps {
  children: React.ReactElement;
  isModalOpen: boolean;
  setIsModalOpen: (isModalOpen: boolean) => void;
}

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
          // our dismiss transition is 150ms long
          setTimeout(() => {
            setIsModalOpen(false);
          }, 150);
        }}
        isActive={isOpen}
      />
    </>
  );
};
