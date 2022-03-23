import React, { useEffect } from "react";

import "./styles.scss";

interface ModalHeaderProps {
  children: React.ReactNode;
}

export const ModalHeader = ({ children }: ModalHeaderProps) => (
  <section className="ModalWrapper--header">{children}</section>
);

interface ModalWrapperProps {
  children: React.ReactNode;
}

export const ModalWrapper = ({ children }: ModalWrapperProps) => {
  useEffect(() => {
    const disableScrollXClass = "ModalWrapper--disable-scroll-x";
    document.querySelector("body")?.classList.add(disableScrollXClass);

    return () =>
      document.querySelector("body")?.classList.remove(disableScrollXClass);
  }, []);

  return <section className="ModalWrapper">{children}</section>;
};

interface ButtonsContainerProps {
  children: React.ReactNode;
}

export const ButtonsContainer = ({ children }: ButtonsContainerProps) => (
  <div className="ModalWrapper--buttons-container">{children}</div>
);

interface SingleButtonContainerProps {
  children: React.ReactNode;
}

export const SingleButtonContainer = ({
  children,
}: SingleButtonContainerProps) => (
  <div className="ModalWrapper--single-button-container">{children}</div>
);
