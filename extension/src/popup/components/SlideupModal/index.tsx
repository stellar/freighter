import React, { useRef, useEffect } from "react";

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
  const [isOpen, setIsOpen] = React.useState(isModalOpen);

  useEffect(() => {
    setIsOpen(isModalOpen);
  }, [isModalOpen]);

  return (
    <>
      <div
        className={`SlideupModal ${isOpen ? "open" : "closed"}`}
        ref={slideupModalRef}
      >
        {children}
      </div>
      <LoadingBackground
        onClick={() => {
          setIsOpen(false);
          // our dismiss transition is 200ms long
          setTimeout(() => {
            setIsModalOpen(false);
          }, 200);
        }}
        isActive={isOpen}
      />
    </>
  );
};
