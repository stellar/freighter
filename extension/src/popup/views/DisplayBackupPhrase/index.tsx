import React, { useEffect, useState } from "react";
import { Button, Input } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Field, Form, Formik } from "formik";

import { showBackupPhrase } from "@shared/api/internal";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { MnemonicDisplay } from "popup/components/mnemonicPhrase/MnemonicDisplay";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import { BackupPhraseWarningMessage } from "popup/components/WarningMessages";

import "./styles.scss";

export const DisplayBackupPhrase = () => {
  const { t } = useTranslation();
  const [errorMessage, setErrorMessage] = useState("");
  const [isPhraseUnlocked, setIsPhraseUnlocked] = useState(false);
  const [mnemonicPhrase, setMnemonicPhrase] = useState("");

  useEffect(() => {
    emitMetric(
      isPhraseUnlocked
        ? METRIC_NAMES.viewDisplayBackupPhrase
        : METRIC_NAMES.viewUnlockBackupPhrase,
    );
  }, [isPhraseUnlocked]);

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
      setMnemonicPhrase(res.mnemonicPhrase);
      setIsPhraseUnlocked(true);
      setErrorMessage("");
      emitMetric(METRIC_NAMES.backupPhraseSuccess);
    }
  };

  return (
    <View>
      <SubviewHeader title={t("Show recovery phrase")} />
      {isPhraseUnlocked ? (
        <>
          <View.Content>
            <div>
              <p>
                {t(
                  "Anyone who has access to this phrase has access to your account and to the funds in it, so save it in a safe and secure place.",
                )}
              </p>
              <MnemonicDisplay mnemonicPhrase={mnemonicPhrase} isPopupView />
            </div>
          </View.Content>
          <View.Footer>
            <Button
              size="md"
              isFullWidth
              variant="primary"
              onClick={() => navigateTo(ROUTES.account)}
            >
              {t("Done")}
            </Button>
          </View.Footer>
        </>
      ) : (
        <>
          <Formik onSubmit={handleSubmit} initialValues={initialValues}>
            {({ dirty, isSubmitting, isValid }) => (
              <Form className="DisplayBackupPhrase__form">
                <View.Content>
                  <BackupPhraseWarningMessage />
                  <Input
                    fieldSize="md"
                    id="password"
                    autoComplete="off"
                    error={errorMessage}
                    customInput={<Field />}
                    type="password"
                    name="password"
                    placeholder={t("Enter your password")}
                  />
                </View.Content>
                <View.Footer>
                  <Button
                    size="md"
                    disabled={!(isValid && dirty)}
                    isFullWidth
                    isLoading={isSubmitting}
                    type="submit"
                    variant="secondary"
                  >
                    {t("Show recovery phrase")}
                  </Button>
                </View.Footer>
              </Form>
            )}
          </Formik>
        </>
      )}
    </View>
  );
};
