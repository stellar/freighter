import React from "react";

import "./styles.scss";

interface LoadingBackgroundProps {
  onClick?: () => void;
  isActive: boolean;
  isOpaque?: boolean;
  isClear?: boolean;
}

export const LoadingBackground = ({
  isActive,
  isOpaque,
  isClear,
  onClick,
}: LoadingBackgroundProps) => (
  <div
    onClick={onClick}
    className={`LoadingBackground ${
      isActive ? "LoadingBackground--active" : ""
    } ${isOpaque ? "LoadingBackground--isOpaque" : ""} ${
      isClear ? "LoadingBackground--isClear" : ""
    }`}
  />
);
