import React from "react";
import styled from "styled-components";
import { useLocation } from "react-router-dom";

import { emitMetric } from "helpers/metrics";

import { HEADER_HEIGHT } from "constants/dimensions";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { COLOR_PALETTE } from "popup/constants/styles";

import { SubmitButton } from "popup/basics/Forms";
import { FullscreenStyle } from "popup/components/FullscreenStyle";

import SuccessIllo from "popup/assets/illo-success-screen.svg";

const HeaderEl = styled.h1`
  font-weight: 200;
  font-size: 2.6rem;
  line-height: 2.75rem;
  margin: 2.5rem 0 3rem;
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

const IlloContainerEl = styled.div`
  position: relative;
  padding: 1rem 0;
`;

const MnemonicPhraseConfirmedMessage = () => (
  <>
    <p>
      Awesome, you passed the test. Keep your seedphrase safe, it’s your
      responsibility.
    </p>
    <p>
      <strong>Note: Lyra cannot recover your seedphrase.</strong>
    </p>
  </>
);

const RecoverAccountSuccessMessage = () => (
  <>
    <p>You successfully imported your account.</p>
    <p>
      <strong>
        Check your account details by clicking on the Lyra icon on your browser.
      </strong>
    </p>
  </>
);

export const FullscreenSuccessMessage = () => {
  const location = useLocation();

  const IS_MNEMONIC_PHRASE_STATE =
    location.pathname === ROUTES.mnemonicPhraseConfirmed;

  const finishButtonMetric = IS_MNEMONIC_PHRASE_STATE
    ? METRIC_NAMES.accountCreatorFinished
    : METRIC_NAMES.recoverAccountFinished;

  return (
    <WrapperEl>
      <FullscreenStyle />
      <ContentWrapperEl>
        <IlloContainerEl>
          <img src={SuccessIllo} alt="Success Illustration" />
        </IlloContainerEl>
        <HeaderEl>Woo, you’re in!</HeaderEl>
        {IS_MNEMONIC_PHRASE_STATE ? (
          <MnemonicPhraseConfirmedMessage />
        ) : (
          <RecoverAccountSuccessMessage />
        )}
        <FinishButtonEl
          onClick={() => {
            emitMetric(finishButtonMetric);
            window.close();
          }}
        >
          All done
        </FinishButtonEl>
      </ContentWrapperEl>
    </WrapperEl>
  );
};
