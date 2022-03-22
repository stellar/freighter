import React from "react";

import "./styles.scss";

interface PopupWrapperProps {
  children: React.ReactNode;
}

export const PopupWrapper = ({ children }: PopupWrapperProps) => (
  <div className="PopupWrapper">
    {/* ALEC TODO - remove? */}
    <div className="PopupWrapper__absolute-anchor">{children}</div>
  </div>
);
