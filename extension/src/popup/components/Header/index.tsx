import React from "react";

import FreighterLogo from "popup/assets/logo-freighter.svg";

import "./styles.scss";

interface HeaderProps {
  isPopupView?: boolean;
}

export const Header = ({ isPopupView = false }: HeaderProps) => (
  <header className={`Header ${isPopupView ? "Header__popup" : ""}`}>
    <div className={isPopupView ? "" : "Header__fullscreen"}>
      <img alt="Freighter logo" src={FreighterLogo} />
    </div>
  </header>
);
