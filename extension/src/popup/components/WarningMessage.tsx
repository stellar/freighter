import React from "react";
import styled from "styled-components";

import {
  FONT_WEIGHT,
  COLOR_PALETTE,
  ROUNDED_CORNERS,
} from "popup/constants/styles";

const WrapperEl = styled.div`
  border-radius: ${ROUNDED_CORNERS};
  background-color: ${({ isHighAlert }: { isHighAlert: boolean }) =>
    isHighAlert ? COLOR_PALETTE.warningHighFaded : COLOR_PALETTE.warningFaded};
  padding: 1.5rem 1.25rem;
  text-align: left;
  font-size: 0.93rem;
  margin: 1.25rem 0;

  p {
    font-size: 0.93rem;

    &:last-child {
      margin-bottom: 0;
    }
  }

  a {
    color: ${COLOR_PALETTE.text};
    text-decoration: underline;
  }

  li {
    margin-bottom: 1rem;
  }
`;

const HeadingEl = styled.div`
  display: flex;
  align-items: center;
`;
const IconEl = styled.img`
  max-width: 1.875rem;
  max-height: 1.875rem;
`;
const SubheaderEl = styled.h2`
  color: ${({ isHighAlert }: { isHighAlert: boolean }) =>
    isHighAlert ? COLOR_PALETTE.warningHigh : COLOR_PALETTE.warning};
  font-weight: ${FONT_WEIGHT.bold};
  font-size: 1.1rem;
  max-width: 23rem;
  padding-left: 0.65rem;
  margin: 0;
`;

export const WarningMessage = ({
  isHighAlert = false,
  subheader,
  icon,
  children,
}: {
  isHighAlert?: boolean;
  subheader: string;
  icon?: string;
  children: React.ReactNode;
}) => (
  <WrapperEl isHighAlert={isHighAlert}>
    <HeadingEl>
      {icon && <IconEl src={icon} alt="Warning Message Icon" />}
      <SubheaderEl isHighAlert={isHighAlert}>{subheader}</SubheaderEl>
    </HeadingEl>
    {children}
  </WrapperEl>
);
