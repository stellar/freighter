import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
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

import { revealSecretKey, showBackupPhrase } from "@shared/api/internal";

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
  One reveal flow for both secrets an account can offer from Edit account.

  consent: the warning and the acknowledgement.
  password: re-authentication. Mobile uses Face ID here; the extension asks
    for the password even while the wallet is unlocked.
  revealed: the secret and Tap to copy.
*/
type Step = "consent" | "password" | "revealed";

type SecretKind = "secretKey" | "recoveryPhrase";

/** The red "Never share" card every step opens with. */
const NeverShareBanner = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="RevealSecretKey__banner" role="alert">
    <div className="RevealSecretKey__banner__title">
      <Icon.AlertCircle />
      {title}
    </div>
    <div className="RevealSecretKey__banner__body">{children}</div>
  </div>
);

/** The phrase as a numbered two-column grid. */
const PhraseGrid = ({ phrase }: { phrase: string }) => (
  <ol
    className="RevealSecretKey__phrase"
    data-testid="reveal-recovery-phrase-value"
  >
    {phrase.split(" ").map((word, i) => (
      <li key={`${i}-${word}`} className="RevealSecretKey__phrase__word">
        <span className="RevealSecretKey__phrase__number">{i + 1}</span>
        <span>{word}</span>
      </li>
    ))}
  </ol>
);

const RevealSecret = ({ kind }: { kind: SecretKind }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("consent");
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [secret, setSecret] = useState("");
  const { state, fetchData } = useGetAppData();

  const isPhrase = kind === "recoveryPhrase";
  // Each string is written out in full so the translation build can find it.
  const copy = isPhrase
    ? {
        title: t("Show recovery phrase"),
        revealedTitle: t("Your recovery phrase"),
        bannerTitle: t("Never share your recovery phrase"),
        revealedBannerTitle: t("Never share your recovery phrase"),
        revealedBannerBody: t(
          "Anyone with it can take control of your wallet.",
        ),
        heading: t("Your recovery phrase controls this wallet"),
        acknowledgement: (
          <Trans
            i18nKey="I understand that sharing my recovery phrase could result in <strong>permanent loss of funds</strong>."
            components={{ strong: <strong /> }}
          />
        ),
        action: t("Reveal recovery phrase"),
        failure: t("Unable to reveal your recovery phrase"),
        testId: "reveal-recovery-phrase",
        screens: ["unlock_recovery_phrase", "show_recovery_phrase"],
      }
    : {
        title: t("Show secret key"),
        revealedTitle: t("Your secret key"),
        bannerTitle: t("Never share your secret key"),
        revealedBannerTitle: t("Never share your secret key"),
        revealedBannerBody: t(
          "Anyone with this key can access your account and funds. Keep it private and store it securely.",
        ),
        heading: t("Your secret key controls this wallet"),
        acknowledgement: (
          <Trans
            i18nKey="I understand that sharing my secret key could result in <strong>permanent loss of funds</strong>."
            components={{ strong: <strong /> }}
          />
        ),
        action: t("Reveal secret key"),
        failure: t("Unable to reveal your secret key"),
        testId: "reveal-secret-key",
        screens: ["unlock_secret_key", "show_secret_key"],
      };

  useEffect(() => {
    emitScreenViewed(copy.screens[step === "revealed" ? 1 : 0], {
      flow: "security",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    fetchData();
    // Drop the secret from memory when the screen goes away.
    return () => setSecret("");
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
    let revealed = "";
    let error = "";

    if (isPhrase) {
      // Until accounts carry a source, the wallet holds one phrase and it
      // roots every phrase-derived account.
      const res = await showBackupPhrase({ activePublicKey, password });
      revealed = res.mnemonicPhrase;
      error = res.error;
    } else {
      const res = await revealSecretKey({
        activePublicKey,
        publicKey,
        password,
      });
      revealed = res.secretKey;
      error = res.error;
    }

    if (error || !revealed) {
      setErrorMessage(error || copy.failure);
    } else {
      setSecret(revealed);
      setErrorMessage("");
      setStep("revealed");
    }
  };

  if (step === "revealed") {
    const copyButton = (
      <CopyText textToCopy={secret}>
        <button
          type="button"
          className="RevealSecretKey__copy"
          data-testid={`${copy.testId}-copy`}
        >
          {t("Tap to copy")}
          <Icon.Copy01 />
        </button>
      </CopyText>
    );

    return (
      <React.Fragment>
        <SubviewHeader title={copy.revealedTitle} />
        <View.Content hasNoTopPadding>
          <div className="RevealSecretKey__revealed">
            <NeverShareBanner title={copy.revealedBannerTitle}>
              {copy.revealedBannerBody}
            </NeverShareBanner>
            {isPhrase ? (
              <PhraseGrid phrase={secret} />
            ) : (
              <div
                className="RevealSecretKey__key"
                data-testid="reveal-secret-key-value"
              >
                {secret}
              </div>
            )}
            {isPhrase ? null : copyButton}
          </div>
        </View.Content>
        {isPhrase ? (
          // Twelve words don't leave room for Tap to copy in the 600px popup,
          // so it sits above Done where it can't scroll out of view.
          <View.Footer customHeight="auto" customGap="0.75rem">
            {copyButton}
            <Button
              size="lg"
              isFullWidth
              isRounded
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              {t("Done")}
            </Button>
          </View.Footer>
        ) : null}
      </React.Fragment>
    );
  }

  if (step === "password") {
    return (
      <React.Fragment>
        <SubviewHeader
          title={copy.title}
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
                  {copy.action}
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
      <SubviewHeader title={copy.title} />
      <View.Content hasNoTopPadding hasNoBottomPadding>
        <div className="RevealSecretKey__consent">
          <NeverShareBanner title={copy.bannerTitle}>
            {t("Anyone with it can take control of your wallet.")}
          </NeverShareBanner>
          <div className="RevealSecretKey__intro">
            <div className="RevealSecretKey__intro__icon">
              <Icon.Shield03 />
            </div>
            <div className="RevealSecretKey__intro__title">{copy.heading}</div>
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
            id={`${copy.testId}-acknowledge`}
            data-testid={`${copy.testId}-acknowledge`}
            checked={hasAcknowledged}
            onChange={(e) => setHasAcknowledged(e.target.checked)}
            label={
              // A div, not a span: SDS styles any span directly inside a
              // checkbox label as the tick box.
              <div className="RevealSecretKey__acknowledge__label">
                {copy.acknowledgement}
              </div>
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
          {copy.action}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};

export const RevealSecretKey = () => <RevealSecret kind="secretKey" />;

export const RevealRecoveryPhrase = () => (
  <RevealSecret kind="recoveryPhrase" />
);
