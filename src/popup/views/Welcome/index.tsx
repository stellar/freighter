import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { Screen } from "popup/components/Layout/Fullscreen/Onboarding";
import { FullscreenStyle } from "popup/components/Layout/Fullscreen/basics/FullscreenStyle";
import { COLOR_PALETTE } from "popup/styles";

const HalfScreen = styled.div`
  padding: 0 1.6rem;
  width: 23rem;
`;

const Box = styled.div`
  border-radius: 1.875rem;
  color: #fff;
  padding: 2.6rem 2.3rem;
  position: relative;
`;

const CreateBox = styled(Box)`
  background: ${COLOR_PALETTE.primaryGradient};
  color: #fff;
`;

const ImportBox = styled(Box)`
  border: 1px solid ${COLOR_PALETTE.primary};
  color: ${COLOR_PALETTE.primary};
`;

const BoxHeader = styled.div`
  color: ${COLOR_PALETTE.text};
  font-size: 2.4rem;
  font-weight: 200;
  height: 7.5rem;
  line-height: 3.75rem;
  margin-bottom: 2.9rem;

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
  color: #fff;
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

const Welcome = () => (
  <>
    <FullscreenStyle />
    <Screen>
      <HalfScreen>
        <BoxHeader>
          Welcome, <br />
          are you new to <strong>Lyra?</strong>
        </BoxHeader>
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
        <BoxHeader />
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
    </Screen>
  </>
);

export default Welcome;
