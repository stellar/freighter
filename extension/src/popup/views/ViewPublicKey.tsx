import React, { useState } from "react";
import { useSelector } from "react-redux";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";
import QrCode from "qrcode.react";

import { emitMetric } from "helpers/metrics";

import { BasicButton } from "popup/basics/Buttons";

import { ROUTES } from "popup/constants/routes";
import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { navigateTo } from "popup/helpers/navigateTo";

import { publicKeySelector } from "popup/ducks/authServices";

import { Toast } from "popup/components/Toast";

import CloseIcon from "popup/assets/icon-close-color.svg";
import CopyIcon from "popup/assets/copy-color.svg";
import StellarExpertIcon from "popup/assets/icon-stellar-expert.svg";

const QrEl = styled.div`
  position: relative;
  padding: 1.5rem 1.75rem;
  background: ${COLOR_PALETTE.offWhite};
  height: 100%;
`;
const Header = styled.div`
  display: flex;
  justify-content: flex-end;

  img {
    display: block;
    width: 1.4rem;
    height: 1.4rem;
  }
`;
const QrCodeContainerEl = styled.div`
  display: flex;
  justify-content: center;
  padding: 3.6rem 0 2.7rem;
`;
const QrCodeEl = styled(QrCode)`
  padding: 0.937rem;
  background: white;
  border-radius: 10px;
  border: 2px solid ${COLOR_PALETTE.greyFaded};
`;
const HeadingEl = styled.h1`
  color: ${COLOR_PALETTE.primary};
  font-weight: ${FONT_WEIGHT.light};
  margin: 1rem 0 0.75rem;
  text-align: center;
`;
const PublicKeyText = styled.p`
  font-family: "Roboto Mono", monospace;
  font-size: 1rem;
  text-align: center;
  line-height: 1.2;
  padding: 0 2rem;
  margin: 0;
  word-break: break-all;
`;
const ButtonsEl = styled.div`
  display: flex;
  justify-content: space-evenly;
  padding: 1rem 0;
`;
const LinkButton = styled(BasicButton)`
  color: ${COLOR_PALETTE.primary};
  opacity: 1;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 2;

  img {
    width: 1.125rem;
    margin-right: 0.5rem;
    vertical-align: middle;
  }
`;
const CopiedToastWrapperEl = styled.div`
  left: 0.625rem;
  bottom: 7rem;
  position: absolute;

  div {
    border: 2px solid ${COLOR_PALETTE.primary};
  }
`;

export const ViewPublicKey = () => {
  const publicKey = useSelector(publicKeySelector);
  const [isCopied, setIsCopied] = useState(false);

  /* TODO: SHOULD BE BASED ON NETWORK SWITCH (MAINNET or TESTNET) */
  const CURRENT_NETWORK = "testnet";

  return (
    <QrEl>
      <Header>
        <BasicButton onClick={() => navigateTo(ROUTES.account)}>
          <img src={CloseIcon} alt="close icon" />
        </BasicButton>
      </Header>
      <HeadingEl>Your Account</HeadingEl>
      <QrCodeContainerEl>
        <QrCodeEl
          style={{
            width: "170px",
            height: "170px",
          }}
          value={publicKey}
        />
      </QrCodeContainerEl>
      <PublicKeyText>{publicKey}</PublicKeyText>
      <ButtonsEl>
        <CopyToClipboard
          data-testid="copy"
          text={publicKey}
          onCopy={() => {
            setIsCopied(true);
            emitMetric(METRIC_NAMES.viewPublicKeyCopy);
          }}
        >
          <LinkButton>
            <img src={CopyIcon} alt="copy button" />
            Copy
          </LinkButton>
        </CopyToClipboard>
        <CopiedToastWrapperEl>
          <Toast
            message="Copied to your clipboard 👌"
            isShowing={isCopied}
            setIsShowing={setIsCopied}
          />
        </CopiedToastWrapperEl>
        <LinkButton
          onClick={() => {
            window.open(
              `https://stellar.expert/explorer/${CURRENT_NETWORK}/account/${publicKey}`,
            );
            emitMetric(METRIC_NAMES.viewPublicKeyClickedStellarExpert);
          }}
        >
          <img src={StellarExpertIcon} alt="view on StellarExpert button" />
          View on StellarExpert
        </LinkButton>
      </ButtonsEl>
    </QrEl>
  );
};
