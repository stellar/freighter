import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

import { HEADER_HEIGHT } from "constants/dimensions";

import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { COLOR_PALETTE } from "popup/constants/styles";

const BoxEl = styled.div`
  position: relative;
  width: 22.75rem;
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

const BoxIconEl = styled.div`
  font-size: 2.8rem;
  position: absolute;
  top: 1.5rem;
  right: 1.6rem;
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
    <ColumnScreenEl>
      <RowScreenEl>
        <LargeHeadingEl>
          Welcome, <br />
          are you new to <strong>Lyra?</strong>
        </LargeHeadingEl>
      </RowScreenEl>
      <RowScreenEl>
        <HalfScreenEl>
          <CreateBoxEl>
            <BoxIconEl>
              <span role="img" aria-label="Waving hand">
                👋
              </span>
            </BoxIconEl>
            <HeadingEl>I’m new!</HeadingEl>
            <p>I’m going to need a seed phrase</p>
            <LinkButtonWrapperEl>
              <CreateButtonEl to="/create-password">
                Create wallet
              </CreateButtonEl>
            </LinkButtonWrapperEl>
          </CreateBoxEl>
        </HalfScreenEl>
        <HalfScreenEl>
          <ImportBoxEl>
            <BoxIconEl>
              <span role="img" aria-label="Seedling">
                🌱
              </span>
            </BoxIconEl>
            <HeadingEl>I’ve done this before</HeadingEl>
            <p>I have my 12 word seed phrase</p>
            <LinkButtonWrapperEl>
              <ImportButtonEl to="/recover-account">
                Import wallet
              </ImportButtonEl>
            </LinkButtonWrapperEl>
          </ImportBoxEl>
        </HalfScreenEl>
      </RowScreenEl>
    </ColumnScreenEl>
  </>
);
