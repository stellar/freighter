import React from "react";
import styled from "styled-components";
import { COLOR_PALETTE } from "popup/constants/styles";

const FooterEl = styled.footer`
  box-sizing: border-box;
  background: ${COLOR_PALETTE.white};
  height: 8.5rem;
  padding: 1.4375rem 2rem;
  text-align: center;
`;

const FooterHeaderEl = styled.h1`
  color: ${COLOR_PALETTE.secondaryText};
  font-size: 0.9rem;
  margin: 0;
`;

const FooterListEl = styled.ul`
  list-style-type: none;
  padding: 1rem 0;
`;

const FooterListItemEl = styled.li`
  font-size: 0.75rem;
`;

export const Footer = () => (
  <FooterEl>
    <FooterHeaderEl>Use Lyra with</FooterHeaderEl>
    <FooterListEl>
      <FooterListItemEl>
        <a href="/">Laboratory</a>
      </FooterListItemEl>
    </FooterListEl>
  </FooterEl>
);
