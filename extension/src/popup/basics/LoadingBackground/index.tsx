import React from "react";

import "./styles.scss";

interface LoadingBackgroundProps {
  onClick?: () => void;
  isActive: boolean;
  isOpaque?: boolean;
}

export const LoadingBackground = ({
  isActive,
  isOpaque,
  onClick,
}: LoadingBackgroundProps) => (
  <div
    onClick={onClick}
    className={`LoadingBackground ${
      isActive ? "LoadingBackground--active" : ""
    } ${isOpaque ? "LoadingBackground--isOpaque" : ""}`}
  />
);
