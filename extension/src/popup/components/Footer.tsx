import React from "react";
import styled from "styled-components";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import { RetinaImg } from "popup/basics/Images";

import accountViewerLogo from "popup/assets/logo-av.png";
import accountViewerLogo2x from "popup/assets/logo-av@2x.png";
import laboratoryLogo from "popup/assets/logo-laboratory.png";
import laboratoryLogo2x from "popup/assets/logo-laboratory@2x.png";
import stellarTermLogo from "popup/assets/logo-stellarterm.png";
import stellarTermLogo2x from "popup/assets/logo-stellarterm@2x.png";
import lumenswapLogo from "popup/assets/Lumenswap-logo.png";
import lumenswapLogo2x from "popup/assets/Lumenswap-logo@2x.png";

const FooterEl = styled.footer`
  box-sizing: border-box;
  background: ${COLOR_PALETTE.white};
  padding: 0.9375rem 0.5rem;
  text-align: center;
`;

const FooterHeaderEl = styled.h1`
  color: ${COLOR_PALETTE.secondaryText};
  font-size: 0.8125rem;
  font-weight: ${FONT_WEIGHT.light};
  margin: 0;
`;

const FooterListEl = styled.ul`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  list-style-type: none;
  margin: 0;
  padding: 1rem 0;
`;

const FooterListItemEl = styled.li`
  font-size: 0.75rem;
  display: inline-block;
`;

export const Footer = () => (
  <FooterEl>
    <FooterHeaderEl>Use Freighter with</FooterHeaderEl>
    <FooterListEl>
      <FooterListItemEl>
        <a
          href="https://accountviewer.stellar.org"
          target="_blank"
          rel="noreferrer"
        >
          <RetinaImg
            retina={accountViewerLogo2x}
            src={accountViewerLogo}
            alt="Stellar Account Viewer logo"
          />
        </a>
      </FooterListItemEl>
      <FooterListItemEl>
        <a
          href="https://laboratory.stellar.org"
          target="_blank"
          rel="noreferrer"
        >
          <RetinaImg
            retina={laboratoryLogo2x}
            src={laboratoryLogo}
            alt="Stellar Laboratory logo"
          />
        </a>
      </FooterListItemEl>
      <FooterListItemEl>
        <a href="https://stellarterm.com" target="_blank" rel="noreferrer">
          <RetinaImg
            retina={stellarTermLogo2x}
            src={stellarTermLogo}
            alt="StellarTerm logo"
          />
        </a>
      </FooterListItemEl>
      <FooterListItemEl>
        <a href="https://lumenswap.io/" target="_blank" rel="noreferrer">
          <RetinaImg
            retina={lumenswapLogo2x}
            src={lumenswapLogo}
            alt="LumenSwap"
          />
        </a>
      </FooterListItemEl>
    </FooterListEl>
  </FooterEl>
);
