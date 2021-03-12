import React from "react";
import styled from "styled-components";

import {
  COLOR_PALETTE,
  FONT_WEIGHT,
  ROUNDED_CORNERS,
} from "popup/constants/styles";

const NotFundedWrapperEl = styled.section`
  background: ${COLOR_PALETTE.white};
  border-radius: ${ROUNDED_CORNERS};
  margin-bottom: 1.2rem;
  padding: 1rem 1.25rem;

  p {
    font-size: 0.875rem;
    line-height: 1.375rem;
    margin: 0;
  }
`;

const NotFundedHeaderEl = styled.h3`
  align-items: center;
  color: ${COLOR_PALETTE.primary};
  display: flex;
  font-size: 1rem;

  &:before {
    border: 2px solid ${COLOR_PALETTE.primary};
    border-radius: 5rem;
    content: "i";
    display: inline-block;
    font-size: 0.8rem;
    font-weight: ${FONT_WEIGHT.bold};
    margin-right: 0.625rem;
    padding: 0.0625rem;
    text-align: center;
    width: 1rem;
  }
`;

export const NotFundedMessage = () => (
  <NotFundedWrapperEl>
    <NotFundedHeaderEl>This Stellar address is not funded</NotFundedHeaderEl>
    <p>To create this account, fund it with a minimum of 1 XLM.</p>
    <p>
      <a
        href="https://developers.stellar.org/docs/tutorials/create-account/#create-account"
        rel="noreferrer"
        target="_blank"
      >
        Learn more about account creation
      </a>
    </p>
    <p>
      <a
        href="https://www.stellar.org/lumens/exchanges"
        rel="noreferrer"
        target="_blank"
      >
        See where you can buy lumens
      </a>
    </p>
  </NotFundedWrapperEl>
);
