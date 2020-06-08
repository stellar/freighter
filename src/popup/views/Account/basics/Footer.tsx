import React from "react";
import styled from "styled-components";
import { COLOR_PALETTE } from "popup/styles";

const FooterEl = styled.footer`
  background: #fff;
  height: 100%;
  padding: 1.4375rem 2rem;
  text-align: center;
`;

const FooterHeader = styled.h1`
  color: ${COLOR_PALETTE.secondaryText};
  font-size: 0.9rem;
  line-height: 1.1875rem;
`;

const FooterList = styled.ul`
  list-style-type: none;
  padding: 0;
`;

const FooterListItem = styled.li`
  font-size: 0.75rem;
`;

const Footer = () => (
  <FooterEl>
    <FooterHeader>Use Lyra with</FooterHeader>
    <FooterList>
      <FooterListItem>
        <a href="/">Laboratory</a>
      </FooterListItem>
    </FooterList>
  </FooterEl>
);

export default Footer;
