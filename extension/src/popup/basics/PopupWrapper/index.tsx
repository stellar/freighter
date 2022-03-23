import React from "react";

import "./styles.scss";

interface PopupWrapperProps {
  children: React.ReactNode;
}

export const PopupWrapper = ({ children }: PopupWrapperProps) => (
  <div className="PopupWrapper">{children}</div>
);
