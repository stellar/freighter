import React from "react";

import "./styles.scss";

/*
  Custom network icon colors are determined by where they fall in the list. We cycle through 4 colors and repeat if we get to the end. 
*/

const DEFAULT_NETWORK_COLORS = ["#30A46C", "#6E56CF"];

const CUSTOM_NETWORK_COLORS = ["#E93D82", "#C4F042", "#0091FF", "#F76808"];

const getNetworkColor = (index: number | null): any => {
  if (index === null) {
    return "";
  }

  // The first 2 networks in the list will always
  if (index < DEFAULT_NETWORK_COLORS.length) {
    return DEFAULT_NETWORK_COLORS[index];
  }

  if (index < CUSTOM_NETWORK_COLORS.length + DEFAULT_NETWORK_COLORS.length) {
    return CUSTOM_NETWORK_COLORS[index - DEFAULT_NETWORK_COLORS.length];
  }

  if (index > CUSTOM_NETWORK_COLORS.length) {
    return getNetworkColor(index - CUSTOM_NETWORK_COLORS.length);
  }

  return CUSTOM_NETWORK_COLORS[index];
};

interface NetworkIconProps {
  index: number | null; // a network's index within the NetworksList array signifies the color
}

export const NetworkIcon = ({ index }: NetworkIconProps) => (
  <div
    className="AccountHeader__network-icon"
    style={{ background: getNetworkColor(index) }}
  />
);
