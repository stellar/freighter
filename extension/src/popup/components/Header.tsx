import React from "react";
import styled from "styled-components";
import { useSelector } from "react-redux";

import { HEADER_HEIGHT } from "constants/dimensions";
import { FONT_FAMILY, COLOR_PALETTE } from "popup/constants/styles";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import FreighterLogoLockup from "popup/assets/logo-lockup-freighter.svg";

const HeaderEl = styled.header`
  background: ${COLOR_PALETTE.primaryGradient};
  font-family: ${FONT_FAMILY};
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2.25rem 1rem 2.25rem 2rem;
  text-align: left;
  height: ${HEADER_HEIGHT}px;
`;

const FreighterLogoEl = styled.img`
  height: 7.1rem;
  width: 10.3rem;
`;

const RightSectionEl = styled.div`
  align-items: flex-end;
  display: flex;
  flex-direction: column;
`;

const NetworkEl = styled.h3`
  opacity: 0.5;
  color: #fff;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1;
  margin-right: 0.5rem;
`;

type HeaderProps = {
  children?: React.ReactNode;
  className?: string;
};

export const Header = ({ children, className, ...props }: HeaderProps) => {
  const { networkName } = useSelector(settingsNetworkDetailsSelector);
  return (
    <HeaderEl className={className} {...props}>
      <FreighterLogoEl alt="Freighter logo" src={FreighterLogoLockup} />
      <RightSectionEl>
        {children}
        <NetworkEl>{networkName}</NetworkEl>
      </RightSectionEl>
    </HeaderEl>
  );
};
