import React, { useEffect } from "react";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import "./styles.scss";

interface ModalHeaderProps {
  children: React.ReactNode;
}

export const ModalHeader = ({ children }: ModalHeaderProps) => (
  <section className="ModalWrapper__header">{children}</section>
);

interface ModalWrapperProps {
  children: React.ReactNode;
}

export const ModalWrapper = ({ children }: ModalWrapperProps) => {
  useEffect(() => {
    const disableScrollXClass = "ModalWrapper__disable-scroll-x";
    document.querySelector("body")?.classList.add(disableScrollXClass);

    return () =>
      document.querySelector("body")?.classList.remove(disableScrollXClass);
  }, []);

  return (
    <SimpleBar className="ModalWrapper__scrollbar">
      <section className="ModalWrapper">{children} </section>
    </SimpleBar>
  );
};

interface ButtonsContainerProps {
  children: React.ReactNode;
}

export const ButtonsContainer = ({ children }: ButtonsContainerProps) => (
  <div className="ModalWrapper__buttons-container">{children}</div>
);
