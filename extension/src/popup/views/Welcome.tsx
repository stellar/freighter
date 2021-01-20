import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

import { HEADER_HEIGHT } from "constants/dimensions";
import { ROUTES } from "popup/constants/routes";
import { COLOR_PALETTE } from "popup/constants/styles";

import { Header } from "popup/components/Header";
import { FullscreenStyle } from "popup/components/FullscreenStyle";

import CreateWalletIllo from "popup/assets/illo-create-wallet.svg";
import ImportWalletIllo from "popup/assets/illo-import-wallet.svg";

const BoxEl = styled.div`
  position: relative;
  width: 22.75rem;
  height: 17.62rem;
  padding: 2.2rem 2.3rem;
  border-radius: 1.875rem;
  color: ${COLOR_PALETTE.white};
`;

const CreateBoxEl = styled(BoxEl)`
  background: ${COLOR_PALETTE.primaryGradient};
  color: ${COLOR_PALETTE.white};
`;

const ImportBoxEl = styled(BoxEl)`
  border: 1px solid ${COLOR_PALETTE.primary};
  color: ${COLOR_PALETTE.primary};
`;

const LargeHeadingEl = styled.div`
  color: ${COLOR_PALETTE.text};
  font-size: 2.4rem;
  font-weight: 200;
  line-height: 1.5;
  margin-bottom: 2.5rem;

  strong {
    color: ${COLOR_PALETTE.primary};
  }
`;

const HeadingEl = styled.h3`
  font-size: 1.6rem;
  font-weight: 400;
  line-height: 2rem;
  margin: 0.75rem 0;
`;

const IlloContainerEl = styled.div`
  position: absolute;
  top: 1.1rem;
  right: 1rem;

  img {
    height: 3.125rem;
  }
`;

const LinkButtonWrapperEl = styled.div`
  text-align: center;
`;

const LinkButtonEl = styled(Link)`
  border-radius: 1rem;
  color: ${COLOR_PALETTE.white};
  display: inline-block;
  font-weight: 800;
  margin: 3.4rem auto 0;
  padding: 1.25rem 2rem;
  text-align: center;
  text-decoration: none;
`;

const CreateButtonEl = styled(LinkButtonEl)`
  background: ${COLOR_PALETTE.secondary};
`;

const ImportButtonEl = styled(LinkButtonEl)`
  background: ${COLOR_PALETTE.primaryGradient};
`;

const ColumnScreenEl = styled.section`
  display: flex;
  flex-direction: column;
  align-content: center;
  justify-content: center;
  max-width: 49rem;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  width: 100%;
  margin: auto;
`;

const RowScreenEl = styled.div`
  display: flex;
  justify-content: space-between;
`;
const HalfScreenEl = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0;
`;

export const Welcome = () => (
  <>
    <FullscreenStyle />
    <Header />
    <ColumnScreenEl>
      <RowScreenEl>
        <LargeHeadingEl>
          Welcome, <br />
          are you new to <strong>Freighter?</strong>
        </LargeHeadingEl>
      </RowScreenEl>
      <RowScreenEl>
        <HalfScreenEl>
          <CreateBoxEl>
            <IlloContainerEl>
              <img src={CreateWalletIllo} alt="Create Wallet Illustration" />
            </IlloContainerEl>
            <HeadingEl>I’m new!</HeadingEl>
            <p>I’m going to need a seed phrase</p>
            <LinkButtonWrapperEl>
              <CreateButtonEl to={ROUTES.accountCreator}>
                Create wallet
              </CreateButtonEl>
            </LinkButtonWrapperEl>
          </CreateBoxEl>
        </HalfScreenEl>
        <HalfScreenEl>
          <ImportBoxEl>
            <IlloContainerEl>
              <img src={ImportWalletIllo} alt="Import Wallet Illustration" />
            </IlloContainerEl>
            <HeadingEl>I’ve done this before</HeadingEl>
            <p>I have my 12 word seed phrase</p>
            <LinkButtonWrapperEl>
              <ImportButtonEl to={ROUTES.recoverAccount}>
                Import wallet
              </ImportButtonEl>
            </LinkButtonWrapperEl>
          </ImportBoxEl>
        </HalfScreenEl>
      </RowScreenEl>
    </ColumnScreenEl>
  </>
);
