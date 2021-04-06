import React, { useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";
import QrCode from "qrcode.react";
import { Formik } from "formik";

import { emitMetric } from "helpers/metrics";

import { BasicButton } from "popup/basics/Buttons";
import { Form, TextField } from "popup/basics/Forms";

import { POPUP_WIDTH } from "constants/dimensions";
import { ROUTES } from "popup/constants/routes";
import {
  COLOR_PALETTE,
  FONT_FAMILY,
  FONT_WEIGHT,
} from "popup/constants/styles";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { navigateTo, openTab } from "popup/helpers/navigate";

import {
  accountNameSelector,
  publicKeySelector,
  updateAccountName,
} from "popup/ducks/authServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { Toast } from "popup/components/Toast";

import CheckIcon from "popup/assets/check.svg";
import CloseIcon from "popup/assets/icon-close-color.svg";
import CopyIcon from "popup/assets/copy-color.svg";
import PencilIcon from "popup/assets/pencil.svg";
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
  margin-bottom: 1rem;

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
const HeadingWrapperEl = styled.div`
  display: flex;
  justify-content: center;
  margin: 0 0 0.25rem 2.9rem;
`;
const HeadingEl = styled.h1`
  color: ${COLOR_PALETTE.primary};
  font-weight: ${FONT_WEIGHT.light};
  margin: 1rem 0 0.75rem;
  max-width: calc(${POPUP_WIDTH}px - 2rem);
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
`;
const EditNameFormEl = styled(Form)`
  position: relative;
`;
const EditNameButtonEl = styled(BasicButton)`
  margin-left: 0.9rem;
`;
const SubmitNameButtonEl = styled(BasicButton)`
  margin-top: -0.5rem;
  position: absolute;
  right: 1.5rem;
  top: 50%;
`;
const AccountNameInputEl = styled(TextField)`
  font-family: ${FONT_FAMILY};
  font-size: 2rem;
  font-weight: ${FONT_WEIGHT.light};
  padding: 1rem 0;
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
  const accountName = useSelector(accountNameSelector);
  const [isCopied, setIsCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const accountNameElRef = useRef<HTMLElement>(null);
  const { networkName } = useSelector(settingsNetworkDetailsSelector);

  const dispatch = useDispatch();

  interface FormValue {
    accountName: string;
  }

  const initialValues: FormValue = {
    accountName,
  };

  const handleSubmit = async (values: FormValue) => {
    const { accountName: newAccountName } = values;
    if (accountName !== newAccountName) {
      await dispatch(updateAccountName(newAccountName));
      emitMetric(METRIC_NAMES.viewPublicKeyAccountRenamed);
    }
    setIsEditingName(false);
  };

  const closeEditNameField = (e: React.ChangeEvent<any>) => {
    if (
      accountNameElRef.current &&
      !accountNameElRef.current.contains(e.target)
    ) {
      setIsEditingName(false);
    }
  };

  return (
    <QrEl onClick={closeEditNameField}>
      <Header>
        <BasicButton onClick={() => navigateTo(ROUTES.account)}>
          <img src={CloseIcon} alt="close icon" />
        </BasicButton>
      </Header>
      {isEditingName ? (
        <Formik initialValues={initialValues} onSubmit={handleSubmit}>
          <section ref={accountNameElRef}>
            <EditNameFormEl>
              <AccountNameInputEl autoComplete="off" name="accountName" />
              <SubmitNameButtonEl type="submit">
                <img src={CheckIcon} alt="check icon" />
              </SubmitNameButtonEl>
            </EditNameFormEl>
          </section>
        </Formik>
      ) : (
        <HeadingWrapperEl>
          <HeadingEl>{accountName}</HeadingEl>
          <EditNameButtonEl onClick={() => setIsEditingName(true)}>
            <img alt="edit name icon" src={PencilIcon} />
          </EditNameButtonEl>
        </HeadingWrapperEl>
      )}
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
            openTab(
              `https://stellar.expert/explorer/${networkName.toLowerCase()}/account/${publicKey}`,
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
