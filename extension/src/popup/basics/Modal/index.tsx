import React from "react";

import "./styles.scss";

interface ModalWrapperProps {
  children: React.ReactNode;
}

export const ModalWrapper = ({ children }: ModalWrapperProps) => (
  <section className="ModalWrapper">{children}</section>
);
