import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

import { HEADER_HEIGHT } from "popup/constants/dimensions";

import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { COLOR_PALETTE } from "popup/constants/styles";

const Box = styled.div`
  position: relative;
  width: 22.75rem;
  padding: 2.2rem 2.3rem;
  border-radius: 1.875rem;
  color: ${COLOR_PALETTE.white};
`;

const CreateBox = styled(Box)`
  background: ${COLOR_PALETTE.primaryGradient};
  color: ${COLOR_PALETTE.white};
`;

const ImportBox = styled(Box)`
  border: 1px solid ${COLOR_PALETTE.primary};
  color: ${COLOR_PALETTE.primary};
`;

const BoxHeader = styled.div`
  color: ${COLOR_PALETTE.text};
  font-size: 2.4rem;
  font-weight: 200;
  line-height: 1.5;
  margin-bottom: 2.5rem;

  strong {
    color: ${COLOR_PALETTE.primary};
  }
`;

const BoxHeaderEl = styled.h3`
  font-size: 1.6rem;
  font-weight: 400;
  line-height: 2rem;
  margin: 0.75rem 0;
`;

const BoxIcon = styled.div`
  font-size: 2.8rem;
  position: absolute;
  top: 1.5rem;
  right: 1.6rem;
`;

const LinkButtonWrapper = styled.div`
  text-align: center;
`;

const LinkButton = styled(Link)`
  border-radius: 1rem;
  color: ${COLOR_PALETTE.white};
  display: inline-block;
  font-weight: 800;
  margin: 3.4rem auto 0;
  padding: 1.25rem 2rem;
  text-align: center;
  text-decoration: none;
`;

const CreateButton = styled(LinkButton)`
  background: ${COLOR_PALETTE.secondary};
`;

const ImportButton = styled(LinkButton)`
  background: ${COLOR_PALETTE.primaryGradient};
`;

const ColumnScreen = styled.section`
  display: flex;
  flex-direction: column;
  align-content: center;
  justify-content: center;
  max-width: 49rem;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  width: 100%;
  margin: auto;
`;

const RowScreen = styled.div`
  display: flex;
  justify-content: space-between;
`;
const HalfScreen = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0;
`;

export const Welcome = () => (
  <>
    <FullscreenStyle />
    <ColumnScreen>
      <RowScreen>
        <BoxHeader>
          Welcome, <br />
          are you new to <strong>Lyra?</strong>
        </BoxHeader>
      </RowScreen>
      <RowScreen>
        <HalfScreen>
          <CreateBox>
            <BoxIcon>
              <span role="img" aria-label="Waving hand">
                👋
              </span>
            </BoxIcon>
            <BoxHeaderEl>I’m new!</BoxHeaderEl>
            <p>I’m going to need a seed phrase</p>
            <LinkButtonWrapper>
              <CreateButton to="/create-password">Create wallet</CreateButton>
            </LinkButtonWrapper>
          </CreateBox>
        </HalfScreen>
        <HalfScreen>
          <ImportBox>
            <BoxIcon>
              <span role="img" aria-label="Seedling">
                🌱
              </span>
            </BoxIcon>
            <BoxHeaderEl>I’ve done this before</BoxHeaderEl>
            <p>I have my 12 word seed phrase</p>
            <LinkButtonWrapper>
              <ImportButton to="/recover-account">Import wallet</ImportButton>
            </LinkButtonWrapper>
          </ImportBox>
        </HalfScreen>
      </RowScreen>
    </ColumnScreen>
  </>
);
