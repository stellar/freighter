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

import { BackButton } from "popup/basics/Buttons";
import {
  Form,
  SubmitButton,
  FormRow,
  ApiErrorMessage,
  TextField,
} from "popup/basics/Forms";

const UnlockAccountEl = styled.div`
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  box-sizing: border-box;
  padding: 2.25rem 2.5rem;
`;
export const HeaderContainerEl = styled.div`
  display: flex;
  align-items: center;
  padding: 2.5rem 0.25rem;
  line-height: 1;
`;
export const HeaderEl = styled.h1`
  color: ${COLOR_PALETTE.primary}};
  font-weight: ${FONT_WEIGHT.light};
  margin: 1rem 0 0.75rem;
`;
const SubheaderEl = styled.h3`
  font-weight: ${FONT_WEIGHT.bold};
  font-size: 0.95rem;
  letter-spacing: 0.1px;
  color: ${COLOR_PALETTE.primary}};
`;

const CustomFormTextFieldEl = styled(TextField)`
  padding-right: ${(props) => (props.error ? "6rem" : "2.2rem")};
`;

const ButtonRowEl = styled.div`
  padding: 1.5rem 0;
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
        <HeaderEl>
          <BackButton onClick={() => history.push({ pathname: "/" })} />
          Show backup phrase
        </HeaderEl>
      </HeaderContainerEl>
      <p>
        Your phrase is the only way to access your account on a new computer.
        Anyone who has access to your phrase has access to your account, so keep
        it noted in a safe place.
      </p>
      <Formik onSubmit={handleSubmit} initialValues={initialValues}>
        {({ isSubmitting, isValid }) => (
          <Form>
            <SubheaderEl>Enter your password to continue</SubheaderEl>
            <FormRow>
              <CustomFormTextFieldEl
                autoComplete="off"
                type="password"
                name="password"
                placeholder="Enter password"
                error={errorMessage}
              />
            </FormRow>
            <ApiErrorMessage error={errorMessage} />
            <ButtonRowEl>
              <SubmitButton isSubmitting={isSubmitting} isValid={isValid}>
                Show Backup Phrase
              </SubmitButton>
            </ButtonRowEl>
          </Form>
        )}
      </Formik>
    </UnlockAccountEl>
  );
};
