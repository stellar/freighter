import React, { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Input, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Field, Form, Formik } from "formik";

import { showBackupPhrase } from "@shared/api/internal";

import { ROUTES } from "popup/constants/routes";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { MnemonicDisplay } from "popup/components/mnemonicPhrase/MnemonicDisplay";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import { BackupPhraseWarningMessage } from "popup/components/WarningMessages";

import "./styles.scss";
import { useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { newTabHref } from "helpers/urls";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

export const DisplayBackupPhrase = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [isPhraseUnlocked, setIsPhraseUnlocked] = useState(false);
  const [mnemonicPhrase, setMnemonicPhrase] = useState("");
  const { state, fetchData } = useGetAppData();

  useEffect(() => {
    emitMetric(
      isPhraseUnlocked
        ? METRIC_NAMES.viewDisplayBackupPhrase
        : METRIC_NAMES.viewUnlockBackupPhrase,
    );
  }, [isPhraseUnlocked]);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    state.state === RequestState.IDLE ||
    state.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  if (state.state === RequestState.ERROR) {
    return (
      <div className="AddAsset__fetch-fail">
        <Notification
          variant="error"
          title={t("Failed to fetch your account data.")}
        >
          {t("Your account data could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (state.data?.type === "re-route") {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${state.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (
    state.data.type === "resolved" &&
    (state.data.account.applicationState ===
      APPLICATION_STATE.PASSWORD_CREATED ||
      state.data.account.applicationState ===
        APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }

  const { publicKey } = state.data.account;

  interface FormValues {
    password: string;
  }
  const initialValues: FormValues = {
    password: "",
  };

  const handleSubmit = async (values: FormValues) => {
    const { password } = values;
    const res = await showBackupPhrase({
      activePublicKey: publicKey,
      password,
    });

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
    <React.Fragment>
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
              variant="tertiary"
              onClick={() => navigateTo(ROUTES.account, navigate)}
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
    </React.Fragment>
  );
};
