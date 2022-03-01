import React, { useState } from "react";
import { Button, Input } from "@stellar/design-system";
import { Field, Formik } from "formik";

import { showBackupPhrase } from "@shared/api/internal";

import { emitMetric } from "helpers/metrics";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";
import { history } from "popup/constants/history";

import { BottomNav } from "popup/components/BottomNav";
import { SubviewHeader } from "popup/components/SubviewHeader";

import { Form } from "popup/basics/Forms";
import { PopupWrapper } from "popup/basics/PopupWrapper";

import { BackupPhraseWarningMessage } from "popup/components/WarningMessages";

import "./styles.scss";

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
    <>
      <PopupWrapper>
        <SubviewHeader title="Show recovery phrase" />
        <BackupPhraseWarningMessage />
        <Formik onSubmit={handleSubmit} initialValues={initialValues}>
          {({ dirty, isSubmitting, isValid }) => (
            <Form>
              <div className="UnlockBackupPhrase--input">
                <Input
                  id="password"
                  autoComplete="off"
                  error={errorMessage}
                  customInput={<Field />}
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                />
              </div>

              <Button
                disabled={!(isValid && dirty)}
                fullWidth
                isLoading={isSubmitting}
                type="submit"
              >
                Show recovery phrase
              </Button>
            </Form>
          )}
        </Formik>
      </PopupWrapper>
      <BottomNav />
    </>
  );
};
