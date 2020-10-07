import React from "react";
import styled from "styled-components";

import {
  FONT_WEIGHT,
  COLOR_PALETTE,
  ROUNDED_CORNERS,
} from "popup/constants/styles";

const El = styled.div`
  border-radius: ${ROUNDED_CORNERS};
  background-color: ${COLOR_PALETTE.warningFaded};
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
  color: ${COLOR_PALETTE.warning};
  font-weight: ${FONT_WEIGHT.bold};
  font-size: 1.1rem;
  max-width: 23rem;
  padding-left: 0.65rem;
  margin: 0;
`;

export const WarningMessage = ({
  subheader,
  icon,
  children,
}: {
  subheader: string;
  icon: string;
  children: React.ReactNode;
}) => (
  <El>
    <HeadingEl>
      <IconEl src={icon} alt="Warning Message Icon" />
      <SubheaderEl>{subheader}</SubheaderEl>
    </HeadingEl>
    {children}
  </El>
);
