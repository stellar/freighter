import React from "react";
import styled from "styled-components";

import { COLOR_PALETTE } from "popup/styles";
import { HEADER_HEIGHT } from "popup/constants";

import { FormButton } from "popup/basics";
import { FullscreenStyle } from "popup/components/Layout/Fullscreen/basics";

const HeaderEl = styled.h1`
  font-weight: 200;
  font-size: 2.6rem;
  line-height: 2.75rem;
  margin: 1rem 0;
`;

const Wrapper = styled.div`
  background: ${COLOR_PALETTE.primary};
  display: flex;
  flex-direction: column;
  height: calc(100vh - ${HEADER_HEIGHT}px);
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 2rem 0;
  text-align: center;
  margin: auto;
  color: ${COLOR_PALETTE.white};
  max-width: 24.375rem;
  height: calc(100vh - ${HEADER_HEIGHT}px);
`;

const FinishButton = styled(FormButton)`
  background: ${COLOR_PALETTE.secondary};
  margin: 2.5rem auto 0;
`;

const Celebration = styled.h1`
  font-size: 5rem;
`;

export const MnemonicPhraseConfirmed = () => (
  <Wrapper>
    <FullscreenStyle />
    <ContentWrapper>
      <HeaderEl>Woo, you’re in!</HeaderEl>
      <Celebration>
        <span role="img" aria-label="Celebration face">
          🥳
        </span>
      </Celebration>
      <p>
        Awesome, you passed the test. Keep your seedphrase safe, it’s your
        responsibility.
      </p>
      <p>
        <strong>Note: Lyra cannot recover your seedphrase.</strong>
      </p>
      <FinishButton
        onClick={() => {
          window.close();
        }}
      >
        All done
      </FinishButton>
    </ContentWrapper>
  </Wrapper>
);
