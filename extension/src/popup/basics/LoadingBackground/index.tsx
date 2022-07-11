import React from "react";

import "./styles.scss";

interface LoadingBackgroundProps {
  onClick?: () => void;
  isActive: boolean;
}

export const LoadingBackground = ({
  isActive,
  onClick,
}: LoadingBackgroundProps) => (
  <div
    onClick={onClick}
    className={`LoadingBackground ${
      isActive ? "LoadingBackground--active" : ""
    }`}
  />
);
