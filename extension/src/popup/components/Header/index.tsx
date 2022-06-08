import React from "react";

import FreighterLogoLockup from "popup/assets/logo-lockup-freighter.svg";

import "./styles.scss";

interface HeaderProps {
  isPopupView?: boolean;
}

export const Header = ({ isPopupView = false }: HeaderProps) => (
  <header className={`Header ${isPopupView ? "Header__popup" : ""}`}>
    <div className={isPopupView ? "" : "Header__fullscreen"}>
      <img alt="Freighter logo" src={FreighterLogoLockup} />
    </div>
  </header>
);
