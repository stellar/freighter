import React from "react";
import styled from "styled-components";
import { useLocation } from "react-router-dom";

import { emitMetric } from "helpers/metrics";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { Header } from "popup/components/Header";

import SuccessIllo from "popup/assets/illo-success-screen.svg";
import ExtensionIllo from "popup/assets/illo-extension.png";

import { Button, InfoBlock } from "@stellar/design-system";

import "./styles.scss";

const HeaderEl = styled.h1`
  font-weight: 200;
  font-size: 2.6rem;
  line-height: 2.75rem;
  margin: 2.5rem 0 3rem;
`;

const WrapperEl = styled.div`
  display: flex;
  flex-flow: column wrap;
  align-items: center;
  justify-content: center;
  height: calc(100vh - 119px);
  width: 100%;
`;

const ContentWrapperEl = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: start;
  padding: 0 0 2rem 0;
  color: var(--pal-text-primary);
  max-width: 24rem;
  > div {
    margin-bottom: 1rem;
  }
`;

const CopyEl = styled.div`
  text-align: center;
  font-size: 1rem;
  line-height: 1.5rem;
  font-weight: var(--font-weight-normal);
  margin-bottom: 1.5rem;
`;

const IlloContainerEl = styled.div`
  position: relative;
  padding: 1rem 0;
`;

const SuccessImageEl = styled.img`
  height: 4.25rem;
`;

const ExtensionImgEl = styled.img`
  height: 3.5rem;
`;

const MnemonicPhraseConfirmedMessage = () => (
  <>
    <CopyEl>
      <p>
        Awesome, you passed the test. Keep your recovery <br />
        phrase safe, it's your responsibility.
      </p>
    </CopyEl>
    <InfoBlock variant={InfoBlock.variant.warning}>
      <div className="InfoBlock__content">
        <div className="InfoBlock__header">
          Avoid scams and keep your account safe:
        </div>
        <ul>
          <li>
            Freighter will never ask for your backup phrase unless you're
            actively importing your account using the browser extension - never
            on an external website.
          </li>
          <li>
            Always check the domain of websites you're using Freighter with
          </li>
          <li>
            Freighter cannot recover your account if you lose your recovery
            phrase, so keep it safe
          </li>
        </ul>
      </div>
    </InfoBlock>
    <Button
      fullWidth
      onClick={() => {
        emitMetric(METRIC_NAMES.accountCreatorFinished);
        window.close();
      }}
    >
      GOT IT
    </Button>
  </>
);

const RecoverAccountSuccessMessage = () => (
  <>
    <CopyEl>
      <p>
        You successfully imported your account. <br />
        <br />
        Check your account details by clicking on the Freighter icon on your
        browser.
      </p>
    </CopyEl>
    <IlloContainerEl>
      <ExtensionImgEl src={ExtensionIllo} alt="Extension" />
    </IlloContainerEl>
    <Button
      fullWidth
      onClick={() => {
        emitMetric(METRIC_NAMES.recoverAccountFinished);
        window.close();
      }}
    >
      ALL DONE
    </Button>
  </>
);

export const FullscreenSuccessMessage = () => {
  const location = useLocation();

  const IS_MNEMONIC_PHRASE_STATE =
    location.pathname === ROUTES.mnemonicPhraseConfirmed;

  return (
    <>
      <Header />
      <FullscreenStyle />
      <WrapperEl>
        <IlloContainerEl>
          <SuccessImageEl src={SuccessIllo} alt="Success" />
        </IlloContainerEl>
        <HeaderEl>Woo, you're in!</HeaderEl>
        <ContentWrapperEl>
          {IS_MNEMONIC_PHRASE_STATE ? (
            <MnemonicPhraseConfirmedMessage />
          ) : (
            <RecoverAccountSuccessMessage />
          )}
        </ContentWrapperEl>
      </WrapperEl>
    </>
  );
};
