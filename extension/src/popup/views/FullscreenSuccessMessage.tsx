import React from "react";
import styled from "styled-components";
import { useLocation } from "react-router-dom";

import { emitMetric } from "helpers/metrics";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import {
  COLOR_PALETTE,
  FONT_WEIGHT,
  ROUNDED_CORNERS,
} from "popup/constants/styles";

import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Header } from "popup/components/Header";
import { SubmitButton } from "popup/basics/Forms";

import WhiteLockIcon from "popup/assets/icon-white-lock.svg";
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
  flex-grow: 1;
  height: 100%;
`;

const ContentWrapperEl = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  padding: 0 0 2rem 0;
  text-align: center;
  margin: 0 auto;
  color: ${COLOR_PALETTE.white};
  max-width: 39.5rem;
`;

const CopyEl = styled.div`
  margin: auto;
  max-width: 24.375rem;
`;

const FinishButtonEl = styled(SubmitButton)`
  background: ${COLOR_PALETTE.secondary};
  margin: 2.5rem auto 0;
`;

const IlloContainerEl = styled.div`
  position: relative;
  padding: 1rem 0;
`;

const MessageEl = styled.div`
  border-radius: ${ROUNDED_CORNERS};
  background-color: #563bf1;
  padding: 1.75rem 1.5rem;
  text-align: left;
  font-size: 0.93rem;
  margin: 1.25rem 0 0;
`;

const IconEl = styled.img`
  display: inline-block;
  margin-top: -0.4rem;
  max-width: 1.875rem;
  max-height: 1.875rem;
  vertical-align: middle;
`;

const MessageSubheaderEl = styled.h2`
  color: ${COLOR_PALETTE.white};
  display: inline-block;
  font-weight: ${FONT_WEIGHT.bold};
  font-size: 1.1rem;
  padding-left: 0.65rem;
  margin: 0;
`;

const MessageListEl = styled.ul`
  padding: 0 1.3rem;

  li {
    margin-top: 1rem;
  }
`;

const MnemonicPhraseConfirmedMessage = () => (
  <>
    <CopyEl>
      <p>
        Awesome, you passed the test. Keep your backup phrase safe, it’s your
        responsibility.
      </p>
    </CopyEl>
    <MessageEl>
      <IconEl src={WhiteLockIcon} />
      <MessageSubheaderEl>
        Avoid scams and keep your account safe:
      </MessageSubheaderEl>
      <MessageListEl>
        <li>
          Lyra will <strong>never ask for your backup phrase</strong> unless
          you're actively importing your account using the browser extension -
          never on an external website
        </li>
        <li>Always check the domain of websites you're using Lyra with</li>
        <li>
          Lyra cannot recover your account if you lose your backup phrase, so
          keep it safe
        </li>
      </MessageListEl>
    </MessageEl>
  </>
);

const RecoverAccountSuccessMessage = () => (
  <CopyEl>
    <p>You successfully imported your account.</p>
    <p>
      <strong>
        Check your account details by clicking on the Lyra icon on your browser.
      </strong>
    </p>
  </CopyEl>
);

export const FullscreenSuccessMessage = () => {
  const location = useLocation();

  const IS_MNEMONIC_PHRASE_STATE =
    location.pathname === ROUTES.mnemonicPhraseConfirmed;

  const finishButtonMetric = IS_MNEMONIC_PHRASE_STATE
    ? METRIC_NAMES.accountCreatorFinished
    : METRIC_NAMES.recoverAccountFinished;

  return (
    <>
      <Header />
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
            {IS_MNEMONIC_PHRASE_STATE ? "Got it!" : "All done"}
          </FinishButtonEl>
        </ContentWrapperEl>
      </WrapperEl>
    </>
  );
};
