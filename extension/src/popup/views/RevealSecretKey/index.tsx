import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  Button,
  Checkbox,
  CopyText,
  Icon,
  Input,
  Notification,
} from "@stellar/design-system";
import { Trans, useTranslation } from "react-i18next";
import { Field, Form, Formik } from "formik";

import { revealSecretKey } from "@shared/api/internal";

import { closeWindow, openTab } from "popup/helpers/navigate";
import { emitScreenViewed } from "helpers/metrics";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";

import "./styles.scss";

/*
  consent: the warning and the acknowledgement.
  password: re-authentication. Mobile uses Face ID here; the extension asks
    for the password even while the wallet is unlocked.
  revealed: the key and Tap to copy.
*/
type Step = "consent" | "password" | "revealed";

export const RevealSecretKey = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [step, setStep] = useState<Step>("consent");
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const { state, fetchData } = useGetAppData();

  useEffect(() => {
    emitScreenViewed(
      step === "revealed" ? "show_secret_key" : "unlock_secret_key",
      { flow: "security" },
    );
  }, [step]);

  useEffect(() => {
    fetchData();
    // Drop the key from memory when the screen goes away.
    return () => setSecretKey("");
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

  if (state.data?.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      closeWindow();
    }
    return (
      <Navigate
        to={`${state.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  reRouteOnboarding({
    type: state.data.type,
    applicationState: state.data.account.applicationState,
    state: state.state,
  });

  const activePublicKey = state.data.account.publicKey;
  // Edit account names the account; without one, the active account.
  const publicKey =
    new URLSearchParams(location.search).get("publicKey") || activePublicKey;

  const handleSubmit = async ({ password }: { password: string }) => {
    const res = await revealSecretKey({
      activePublicKey,
      publicKey,
      password,
    });

    if (res.error || !res.secretKey) {
      setErrorMessage(res.error || t("Unable to reveal your secret key"));
    } else {
      setSecretKey(res.secretKey);
      setErrorMessage("");
      setStep("revealed");
    }
  };

  if (step === "revealed") {
    return (
      <React.Fragment>
        <SubviewHeader title={t("Your secret key")} />
        <View.Content hasNoTopPadding>
          <div className="RevealSecretKey__revealed">
            <Notification
              variant="error"
              icon={<Icon.AlertCircle />}
              title={t("Never share your secret key")}
            >
              {t(
                "Anyone with this key can access your account and funds. Keep it private and store it securely.",
              )}
            </Notification>
            <div
              className="RevealSecretKey__key"
              data-testid="reveal-secret-key-value"
            >
              {secretKey}
            </div>
            <CopyText textToCopy={secretKey}>
              <button
                type="button"
                className="RevealSecretKey__copy"
                data-testid="reveal-secret-key-copy"
              >
                {t("Tap to copy")}
                <Icon.Copy01 />
              </button>
            </CopyText>
          </div>
        </View.Content>
      </React.Fragment>
    );
  }

  if (step === "password") {
    return (
      <React.Fragment>
        <SubviewHeader
          title={t("Show secret key")}
          customBackAction={() => {
            setErrorMessage("");
            setStep("consent");
          }}
        />
        <Formik onSubmit={handleSubmit} initialValues={{ password: "" }}>
          {({ dirty, isSubmitting, isValid }) => (
            <Form className="RevealSecretKey__form">
              <View.Content hasNoTopPadding hasNoBottomPadding>
                <Input
                  fieldSize="md"
                  id="password"
                  autoComplete="off"
                  label={t("Password")}
                  error={errorMessage}
                  customInput={<Field />}
                  type="password"
                  name="password"
                  placeholder={t("Enter your password")}
                  autoFocus
                />
              </View.Content>
              <View.Footer>
                <Button
                  size="lg"
                  disabled={!(isValid && dirty)}
                  isFullWidth
                  isRounded
                  isLoading={isSubmitting}
                  type="submit"
                  variant="destructive"
                >
                  {t("Reveal secret key")}
                </Button>
              </View.Footer>
            </Form>
          )}
        </Formik>
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <SubviewHeader title={t("Show secret key")} />
      <View.Content hasNoTopPadding hasNoBottomPadding>
        <div className="RevealSecretKey__consent">
          <Notification
            variant="error"
            icon={<Icon.AlertCircle />}
            title={t("Never share your secret key")}
          >
            {t("Anyone with it can take control of your wallet.")}
          </Notification>
          <div className="RevealSecretKey__intro">
            <div className="RevealSecretKey__intro__icon">
              <Icon.Shield03 />
            </div>
            <div className="RevealSecretKey__intro__title">
              {t("Your secret key controls this wallet")}
            </div>
            <div className="RevealSecretKey__intro__subtitle">
              {t("Keep it secure. You’ll need it to restore your wallet.")}
            </div>
          </div>
        </div>
      </View.Content>
      <View.Footer customHeight="auto" customGap="1.5rem">
        <div className="RevealSecretKey__acknowledge">
          <Checkbox
            fieldSize="md"
            id="reveal-secret-key-acknowledge"
            data-testid="reveal-secret-key-acknowledge"
            checked={hasAcknowledged}
            onChange={(e) => setHasAcknowledged(e.target.checked)}
            label={
              <span className="RevealSecretKey__acknowledge__label">
                <Trans
                  i18nKey="I understand that sharing my secret key could result in <strong>permanent loss of funds</strong>."
                  components={{ strong: <strong /> }}
                />
              </span>
            }
          />
        </div>
        <Button
          size="lg"
          disabled={!hasAcknowledged}
          isFullWidth
          isRounded
          variant="destructive"
          onClick={() => setStep("password")}
        >
          {t("Reveal secret key")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
