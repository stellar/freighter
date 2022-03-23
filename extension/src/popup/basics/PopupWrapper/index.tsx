import React from "react";

import "./styles.scss";

interface PopupWrapperProps {
  children: React.ReactNode;
}

export const PopupWrapper = ({ children }: PopupWrapperProps) => (
  // ALEC TODO - remove
  <div className="PopupWrapper__deleteme">
    <div className="PopupWrapper">{children}</div>
  </div>
);
