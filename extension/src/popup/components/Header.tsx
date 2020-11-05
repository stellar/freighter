import React from "react";
import styled from "styled-components";

import { NETWORK_NAME } from "@shared/constants/stellar";
import { HEADER_HEIGHT } from "constants/dimensions";
import { COLOR_PALETTE } from "popup/constants/styles";

import FreighterLogoLockup from "popup/assets/logo-lockup-freighter.svg";

const HeaderEl = styled.header`
  background: ${COLOR_PALETTE.primaryGradient};
  font-family: "Muli";
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2.25rem 2rem;
  text-align: left;
  height: ${HEADER_HEIGHT}px;
`;

const FreighterLogoEl = styled.img`
  height: 7.1rem;
  width: 10.3rem;
`;

const NetworkEl = styled.h3`
  opacity: 0.5;
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1;
`;

type HeaderProps = {
  className?: string;
};

export const Header = ({ className, ...props }: HeaderProps) => (
  <HeaderEl className={className} {...props}>
    <FreighterLogoEl alt="Freighter logo" src={FreighterLogoLockup} />
    <NetworkEl>{NETWORK_NAME}</NetworkEl>
  </HeaderEl>
);
