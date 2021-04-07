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

const NetworkWrapperEl = styled.div`
  align-items: center;
  display: flex;
  margin-right: 0.5rem;
`;

const NetworkEl = styled.h3`
  color: ${COLOR_PALETTE.white};
  font-family: Arial, sans-serif;
  font-size: 0.9375rem;
  font-weight: 400;
  line-height: 1;
`;

const NetworkIconEl = styled.div`
  background: ${({ isTestnet }: { isTestnet: boolean }) =>
    isTestnet
      ? COLOR_PALETTE.testNetworkIcon
      : COLOR_PALETTE.publicNetworkIcon};
  border-radius: 2rem;
  height: 0.6875rem;
  margin-right: 0.5rem;
  position: relative;
  width: 0.6875rem;
`;

type HeaderProps = {
  children?: React.ReactNode;
  className?: string;
};

export const Header = ({ children, className, ...props }: HeaderProps) => {
  const { isTestnet, networkName } = useSelector(
    settingsNetworkDetailsSelector,
  );
  return (
    <HeaderEl className={className} {...props}>
      <FreighterLogoEl alt="Freighter logo" src={FreighterLogoLockup} />
      <RightSectionEl>
        {children}
        <NetworkWrapperEl>
          <NetworkIconEl isTestnet={isTestnet} />
          <NetworkEl>{networkName}</NetworkEl>
        </NetworkWrapperEl>
      </RightSectionEl>
    </HeaderEl>
  );
};
