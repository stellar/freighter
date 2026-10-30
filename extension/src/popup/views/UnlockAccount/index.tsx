import { Button, Heading, Input } from "@stellar/design-system";
import { Field, FieldProps, Form, Formik } from "formik";
import get from "lodash/get";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import { reconcileAnalyticsUserId } from "helpers/metrics";
import LogoVarial from "popup/assets/logo-varial.svg?react";
import { AppDispatch } from "popup/App";
import { View } from "popup/basics/layout/View";
import { RebrandNotice } from "popup/components/RebrandNotice";
import { ROUTES } from "popup/constants/routes";
import {
  authErrorSelector,
  confirmPassword,
  hasPrivateKeySelector,
} from "popup/ducks/accountServices";
import { claimRebrandAnnouncement } from "@shared/api/internal";

import { ForgotPasswordSheet } from "./ForgotPasswordSheet";

import "./styles.scss";

interface FormValues {
  password: string;
}

const initialValues: FormValues = { password: "" };

export const UnlockAccount = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const from = get(location, "state.from.pathname", "") as ROUTES;
  const queryParams = get(location, "search", "");
  const destination = from || ROUTES.account;

  const dispatch = useDispatch<AppDispatch>();
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  const authError = useSelector(authErrorSelector);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  // Track the initial auth state so we don't auto-navigate if the
  // component happens to mount while the wallet is already unlocked
  // (e.g. a stale `/unlock-account` route). We only redirect on the
  // false → true transition that signals an unlock just happened
  // (either via this surface's password submit or via a cross-surface
  // SESSION_UNLOCKED broadcast saving fresh auth state).
  const wasLockedOnMount = useRef(!hasPrivateKey);

  const handleSubmit = async ({ password }: FormValues) => {
    const response = await dispatch(confirmPassword(password));
    // Navigation is handled by the `hasPrivateKey` effect below so
    // that both password-submit and cross-surface SESSION_UNLOCKED
    // broadcasts converge on the same destination.
    if (confirmPassword.fulfilled.match(response)) {
      // Fire-and-forget: adopt the auth-derived analytics/Sentry user id
      // now that the session is unlocked. Never blocks the unlock flow.
      void reconcileAnalyticsUserId();
    }
  };

  useEffect(() => {
    if (!wasLockedOnMount.current || !hasPrivateKey) {
      return;
    }

    const target = `${destination}${queryParams}`;

    // Wallets that pre-date the rebrand get the one-time announcement before
    // their destination. The background hands it out once, so of several
    // surfaces unlocked by the same broadcast only the first shows it.
    const continueToDestination = async () => {
      let shouldShowAnnouncement = false;
      try {
        shouldShowAnnouncement = await claimRebrandAnnouncement();
      } catch {
        // Fail closed: a messaging failure skips the announcement.
      }

      if (shouldShowAnnouncement) {
        navigate(ROUTES.rebrandAnnouncement, {
          replace: true,
          state: { destination: target },
        });
        return;
      }

      navigate(target, { replace: true });
    };

    void continueToDestination();
  }, [hasPrivateKey, destination, queryParams, navigate]);

  return (
    <React.Fragment>
      <View.Content alignment="center">
        <div className="UnlockAccount" data-testid="unlock-account">
          <LogoVarial className="UnlockAccount__logo" aria-hidden="true" />

          <div className="UnlockAccount__titles">
            <Heading as="h1" size="xs" weight="semi-bold">
              {t("Welcome back")}
            </Heading>
            <RebrandNotice size="sm" />
          </div>

          <Formik initialValues={initialValues} onSubmit={handleSubmit}>
            {({ dirty, isSubmitting, setFieldValue }) => (
              <Form className="UnlockAccount__form">
                <Field name="password">
                  {({ field }: FieldProps) => (
                    <Input
                      {...field}
                      id="password-input"
                      data-testid="enter-password-input"
                      isPassword
                      fieldSize="lg"
                      autoComplete="off"
                      autoFocus
                      placeholder={t("Password")}
                      onChange={(e) => {
                        e.stopPropagation();
                        setFieldValue(
                          "password",
                          (e.target as HTMLInputElement).value,
                        );
                      }}
                      error={authError}
                    />
                  )}
                </Field>

                <div className="UnlockAccount__buttons">
                  <Button
                    data-testid="enter-password-submit"
                    size="lg"
                    variant="secondary"
                    isFullWidth
                    isRounded
                    type="submit"
                    isLoading={isSubmitting}
                    disabled={!dirty}
                  >
                    {t("Unlock")}
                  </Button>
                  <Button
                    data-testid="forgot-password-button"
                    size="lg"
                    variant="tertiary"
                    isFullWidth
                    isRounded
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                  >
                    {t("Forgot password")}
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </View.Content>

      <ForgotPasswordSheet
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
    </React.Fragment>
  );
};
