import React, { useState } from "react";
import styled from "styled-components";
import { Formik } from "formik";

import { showBackupPhrase } from "@shared/api/internal";

import { POPUP_WIDTH } from "constants/dimensions";

import { emitMetric } from "helpers/metrics";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";
import { history } from "popup/constants/history";
import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

import { navigateTo } from "popup/helpers/navigateTo";

import { BackButton } from "popup/basics/Buttons";
import {
  Form,
  SubmitButton,
  FormRow,
  ApiErrorMessage,
  TextField,
} from "popup/basics/Forms";

import { BackupPhraseWarningMessage } from "popup/components/warningMessages/BackupPhraseWarningMessage";

const UnlockAccountEl = styled.div`
  background: ${COLOR_PALETTE.background};
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  box-sizing: border-box;
  padding: 2.68rem 2.18rem;
`;
export const HeaderContainerEl = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 0;
  line-height: 1;
  margin-bottom: 2.5rem;
`;
export const HeaderEl = styled.h1`
  color: ${COLOR_PALETTE.primary}};
  font-weight: ${FONT_WEIGHT.light};
  font-size: 1.56rem;
  margin: 0;
  padding-left: 1rem;
`;
export const BackButtonEl = styled(BackButton)`
  position: relative;
  top: 0;
  left: 0;
`;
const CustomFormTextFieldEl = styled(TextField)`
  padding-right: ${(props) => (props.error ? "6rem" : "2.2rem")};
`;
const ButtonRowEl = styled.div`
  padding: 1.5rem 0;
`;
const FormRowEl = styled(FormRow)`
  padding: 2rem 0 0.15rem;
`;

export const UnlockBackupPhrase = () => {
  const destination = ROUTES.displayBackupPhrase;

  const [errorMessage, setErrorMessage] = useState("");

  interface FormValues {
    password: string;
  }
  const initialValues: FormValues = {
    password: "",
  };

  const handleSubmit = async (values: FormValues) => {
    const { password } = values;
    const res = await showBackupPhrase(password);

    if (res.error) {
      setErrorMessage(res.error);
      emitMetric(METRIC_NAMES.backupPhraseFail, {
        error_type: res.error,
      });
    } else {
      history.push(destination);
      setErrorMessage("");
      emitMetric(METRIC_NAMES.backupPhraseSuccess);
    }
  };

  return (
    <UnlockAccountEl>
      <HeaderContainerEl>
        <BackButtonEl onClick={() => navigateTo(ROUTES.account)} />
        <HeaderEl>Show backup phrase</HeaderEl>
      </HeaderContainerEl>
      <BackupPhraseWarningMessage />
      <Formik onSubmit={handleSubmit} initialValues={initialValues}>
        {({ dirty, isSubmitting, isValid }) => (
          <Form>
            <FormRowEl>
              <CustomFormTextFieldEl
                autoComplete="off"
                type="password"
                name="password"
                placeholder="Enter your password"
                error={errorMessage}
              />
            </FormRowEl>
            <ApiErrorMessage error={errorMessage} />
            <ButtonRowEl>
              <SubmitButton
                dirty={dirty}
                isSubmitting={isSubmitting}
                isValid={isValid}
              >
                Show my backup phrase
              </SubmitButton>
            </ButtonRowEl>
          </Form>
        )}
      </Formik>
    </UnlockAccountEl>
  );
};
