import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Button,
  CopyText,
  Icon,
  Input,
  Notification,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Field, Form, Formik } from "formik";

import { revealSecretKey } from "@shared/api/internal";

import { ROUTES } from "popup/constants/routes";
import { closeWindow, navigateTo, openTab } from "popup/helpers/navigate";
import { emitScreenViewed } from "helpers/metrics";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";

import "./styles.scss";

export const RevealSecretKey = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const { state, fetchData } = useGetAppData();

  const isKeyRevealed = !!secretKey;

  useEffect(() => {
    emitScreenViewed(isKeyRevealed ? "show_secret_key" : "unlock_secret_key", {
      flow: "security",
    });
  }, [isKeyRevealed]);

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

  const { publicKey } = state.data.account;

  interface FormValues {
    password: string;
  }
  const initialValues: FormValues = {
    password: "",
  };

  const handleSubmit = async ({ password }: FormValues) => {
    const res = await revealSecretKey({
      activePublicKey: publicKey,
      publicKey,
      password,
    });

    if (res.error || !res.secretKey) {
      setErrorMessage(res.error || t("Unable to reveal your secret key"));
    } else {
      setSecretKey(res.secretKey);
      setErrorMessage("");
    }
  };

  return (
    <React.Fragment>
      <SubviewHeader
        title={isKeyRevealed ? t("Your secret key") : t("Show secret key")}
      />
      {isKeyRevealed ? (
        <>
          <View.Content hasNoTopPadding hasNoBottomPadding>
            <div className="RevealSecretKey__container">
              <div
                className="RevealSecretKey__key"
                data-testid="reveal-secret-key-value"
              >
                {secretKey}
              </div>
              <CopyText textToCopy={secretKey}>
                <Button
                  size="md"
                  variant="tertiary"
                  isRounded
                  icon={<Icon.Copy01 />}
                  iconPosition="left"
                >
                  {t("Copy")}
                </Button>
              </CopyText>
              <span className="RevealSecretKey__description">
                {t(
                  "Your secret key gives full access to this account. Never share it with anyone.",
                )}
              </span>
            </div>
          </View.Content>
          <View.Footer>
            <Button
              size="lg"
              isFullWidth
              isRounded
              variant="secondary"
              onClick={() => navigateTo(ROUTES.account, navigate)}
            >
              {t("Done")}
            </Button>
          </View.Footer>
        </>
      ) : (
        <Formik onSubmit={handleSubmit} initialValues={initialValues}>
          {({ dirty, isSubmitting, isValid }) => (
            <Form className="RevealSecretKey__form">
              <View.Content hasNoTopPadding hasNoBottomPadding>
                <div className="RevealSecretKey__warning">
                  <span>
                    {t(
                      "Anyone with your secret key has full control of this account and its funds.",
                    )}
                  </span>
                  <span>
                    {t(
                      "Make sure no one can see your screen before you continue.",
                    )}
                  </span>
                </div>
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
                  variant="secondary"
                >
                  {t("Show secret key")}
                </Button>
              </View.Footer>
            </Form>
          )}
        </Formik>
      )}
    </React.Fragment>
  );
};
