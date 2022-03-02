import React, { useEffect, useState } from "react";
import { Button, Input, CopyText, TextLink } from "@stellar/design-system";

import { Field, Formik } from "formik";

import { showBackupPhrase } from "@shared/api/internal";

import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";
import { useMnemonicPhrase } from "popup/helpers/useMnemonicPhrase";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { BottomNav } from "popup/components/BottomNav";
import { MnemonicDisplay } from "popup/components/mnemonicPhrase/MnemonicDisplay";
import { SubviewHeader } from "popup/components/SubviewHeader";

import { Form } from "popup/basics/Forms";
import { PopupWrapper } from "popup/basics/PopupWrapper";

import { BackupPhraseWarningMessage } from "popup/components/WarningMessages";

import "./styles.scss";

export const DisplayBackupPhrase = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const [isPhraseUnlocked, setIsPhraseUnlocked] = useState(false);
  const mnemonicPhrase = useMnemonicPhrase();

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
      setIsPhraseUnlocked(true);
      setErrorMessage("");
      emitMetric(METRIC_NAMES.backupPhraseSuccess);
    }
  };

  return (
    <div className="DisplayBackupPhrase">
      <PopupWrapper>
        <SubviewHeader title="Show recovery phrase" />
        {isPhraseUnlocked ? (
          <>
            <p>
              Anyone who has access to this phrase has access to your account
              and to the funds in it, so save it in a safe and secure place.
            </p>
            <MnemonicDisplay mnemonicPhrase={mnemonicPhrase} isPopupView />
            <CopyText
              showCopyIcon
              showTooltip
              textToCopy={mnemonicPhrase}
              tooltipPosition={CopyText.tooltipPosition.LEFT}
            >
              <TextLink>Copy</TextLink>
            </CopyText>
            <div className="DisplayBackupPhrase--submit">
              <Button fullWidth onClick={() => navigateTo(ROUTES.account)}>
                Done
              </Button>
            </div>
          </>
        ) : (
          <>
            <BackupPhraseWarningMessage />
            <Formik onSubmit={handleSubmit} initialValues={initialValues}>
              {({ dirty, isSubmitting, isValid }) => (
                <Form>
                  <div className="DisplayBackupPhrase--input">
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
          </>
        )}
      </PopupWrapper>
      <BottomNav />
    </div>
  );
};
