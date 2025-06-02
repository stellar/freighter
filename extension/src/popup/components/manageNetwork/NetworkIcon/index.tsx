import React from "react";
import { Icon } from "@stellar/design-system";

import "./styles.scss";

/*
  Custom network icon colors are determined by where they fall in the list. We cycle through 4 colors and repeat if we get to the end. 
*/

const DEFAULT_NETWORK_COLORS = ["mainnet", "testnet"];

const CUSTOM_NETWORK_COLORS = ["custom1", "custom2", "custom3", "custom4"];

const getNetworkColor = (index: number | null): any => {
  if (index === null) {
    return "";
  }

  // The first 2 networks in the list should always be the DEFAULT_NETWORKs
  if (index < DEFAULT_NETWORK_COLORS.length) {
    return DEFAULT_NETWORK_COLORS[index];
  }

  // If these networks fall in our first pass through the custom colors, use the network index to find what color to use
  if (index < CUSTOM_NETWORK_COLORS.length + DEFAULT_NETWORK_COLORS.length) {
    return CUSTOM_NETWORK_COLORS[index - DEFAULT_NETWORK_COLORS.length];
  }

  // We've already cycled through the custom network colors once. Start over from the beginning
  if (index > CUSTOM_NETWORK_COLORS.length) {
    return getNetworkColor(index - CUSTOM_NETWORK_COLORS.length);
  }

  return CUSTOM_NETWORK_COLORS[index];
};

interface NetworkIconProps {
  index: number | null; // a network's index within the NetworksList array signifies the color
}

export const NetworkIcon = ({ index }: NetworkIconProps) => (
  <div className={`NetworkIcon NetworkIcon--${getNetworkColor(index)}`}>
    <Icon.Globe02 />
  </div>
);
