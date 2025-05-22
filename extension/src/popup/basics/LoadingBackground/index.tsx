import React from "react";

import "./styles.scss";

interface LoadingBackgroundProps {
  onClick?: () => void;
  isActive: boolean;
  isOpaque?: boolean;
  isClear?: boolean;
  isFullScreen?: boolean;
}

export const LoadingBackground = ({
  isActive,
  isOpaque,
  isClear,
  isFullScreen,
  onClick,
}: LoadingBackgroundProps) => (
  <div
    data-testid="LoadingBackground"
    onClick={onClick}
    className={`LoadingBackground ${
      isActive ? "LoadingBackground--active" : ""
    } ${isOpaque ? "LoadingBackground--isOpaque" : ""} ${
      isClear ? "LoadingBackground--isClear" : ""
    } ${isFullScreen ? "LoadingBackground--isFullScreen" : ""}`}
  />
);
