import React, { useState } from "react";
import styled from "styled-components";
import { Formik } from "formik";

import { showBackupPhrase } from "@shared/api/internal";

import { emitMetric } from "helpers/metrics";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";
import { history } from "popup/constants/history";

import { SubviewHeader, SubviewWrapper } from "popup/basics/AccountSubview";
import {
  Form,
  SubmitButton,
  FormRow,
  ApiErrorMessage,
  TextField,
} from "popup/basics/Forms";

import { BackupPhraseWarningMessage } from "popup/components/WarningMessages";

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
    <SubviewWrapper>
      <SubviewHeader headerText="Show backup phrase" />
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
    </SubviewWrapper>
  );
};
