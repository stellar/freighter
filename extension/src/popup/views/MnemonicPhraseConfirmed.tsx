import React from "react";
import styled from "styled-components";

import { emitMetric } from "helpers/metrics";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { COLOR_PALETTE } from "popup/constants/styles";
import { HEADER_HEIGHT } from "constants/dimensions";

import { SubmitButton } from "popup/basics/Forms";
import { FullscreenStyle } from "popup/components/FullscreenStyle";

const HeaderEl = styled.h1`
  font-weight: 200;
  font-size: 2.6rem;
  line-height: 2.75rem;
  margin: 1rem 0;
`;

const WrapperEl = styled.div`
  background: ${COLOR_PALETTE.primary};
  display: flex;
  flex-direction: column;
  height: calc(100vh - ${HEADER_HEIGHT}px);
`;

const ContentWrapperEl = styled.div`
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

const FinishButtonEl = styled(SubmitButton)`
  background: ${COLOR_PALETTE.secondary};
  margin: 2.5rem auto 0;
`;

const CelebrationEl = styled.h1`
  font-size: 5rem;
`;

export const MnemonicPhraseConfirmed = () => (
  <WrapperEl>
    <FullscreenStyle />
    <ContentWrapperEl>
      <HeaderEl>Woo, you’re in!</HeaderEl>
      <CelebrationEl>
        <span role="img" aria-label="Celebration face">
          🥳
        </span>
      </CelebrationEl>
      <p>
        Awesome, you passed the test. Keep your seedphrase safe, it’s your
        responsibility.
      </p>
      <p>
        <strong>Note: Lyra cannot recover your seedphrase.</strong>
      </p>
      <FinishButtonEl
        onClick={() => {
          emitMetric(METRIC_NAMES.newWalletFinished);
          window.close();
        }}
      >
        All done
      </FinishButtonEl>
    </ContentWrapperEl>
  </WrapperEl>
);
