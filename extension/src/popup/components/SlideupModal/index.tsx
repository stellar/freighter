import React, { useEffect, useRef, useState } from "react";

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
  const [slideupModalHeight, setSlideupModalHeight] = useState(-500);

  useEffect(() => {
    const height = slideupModalRef.current?.clientHeight || 0;
    setSlideupModalHeight(-height);
  }, [slideupModalRef]);

  return (
    <>
      <div
        className="SlideupModal"
        ref={slideupModalRef}
        style={{
          bottom: isModalOpen ? "0px" : `${slideupModalHeight}px`,
        }}
      >
        {children}
      </div>
      <LoadingBackground
        onClick={() => setIsModalOpen(false)}
        isActive={isModalOpen}
      />
    </>
  );
};
