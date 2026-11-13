import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Formik } from "formik";
import { object as YupObject } from "yup";
import {
  Button,
  Card,
  Heading,
  Icon,
  Notification,
  Text,
  Textarea,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { AppDispatch } from "popup/App";
import {
  PasswordForm,
  initialValues,
  FormValues,
} from "popup/components/accountCreator/PasswordForm";
import { Onboarding, OnboardingError } from "popup/components/Onboarding";
import { BackButton } from "popup/basics/buttons/BackButton";
import { View } from "popup/basics/layout/View";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { parseImportSecret } from "popup/helpers/parseImportSecret";
import {
  password as passwordValidator,
  confirmPassword as confirmPasswordValidator,
  termsOfUse as termsofUseValidator,
} from "popup/helpers/validators";
import {
  clearApiError,
  recoverAccount,
  recoverAccountFromSecretKey,
} from "popup/ducks/accountServices";

import "./styles.scss";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { useRecoverAccountData } from "./hooks/useGetRecoverAccountData";
import { ImportStatus } from "./ImportStatus";

// How long "Your wallet is ready!" stays up before the success route.
export const READY_SCREEN_MS = 1500;

// Background errors that mean the value itself was rejected.
const INVALID_INPUT_ERRORS = ["Invalid mnemonic phrase", "Invalid secret key"];

const RecoverAccountSchema = YupObject().shape({
  password: passwordValidator,
  confirmPassword: confirmPasswordValidator,
  termsOfUse: termsofUseValidator,
});

/*
  Onboarding import: one text box that takes a recovery phrase or a secret
  key, then a password, then "importing" and "ready" before the success route.

  input / password: the password step is its own history entry, so the
  password form's Back button (navigate(-1)) returns to the text box with the
  value still in component state. Only Next opens that step; the history
  state alone does not.
  importing / ready: full-screen status while the background stores the
  account.

  The value is dropped from state once the import succeeds.
*/
type Step = "input" | "password" | "importing" | "ready";
type ImportPhase = "form" | "importing" | "ready";

export const RecoverAccount = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch: AppDispatch = useDispatch();

  const [secretInput, setSecretInput] = useState("");
  const [inputError, setInputError] = useState("");
  const [isInputVisible, setIsInputVisible] = useState(false);
  const [phase, setPhase] = useState<ImportPhase>("form");
  // Enter in the password form, or a second click before it unmounts,
  // would otherwise start a second import.
  const isImporting = useRef(false);
  // The user can leave the route while an import is pending; nothing after
  // its awaits may touch the UI or history once this view is gone.
  const isMounted = useRef(false);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const { state, fetchData } = useRecoverAccountData();

  // Set by Next once the value parses; reset whenever it is edited. History
  // state alone (it survives a reload under HashRouter) never opens the
  // password step.
  const [hasConfirmedInput, setHasConfirmedInput] = useState(false);
  const isPasswordEntry =
    (location.state as { step?: string } | null)?.step === "password";
  // Read by the failure path, which can run after browser Back has already
  // left the password entry.
  const isPasswordEntryRef = useRef(isPasswordEntry);
  isPasswordEntryRef.current = isPasswordEntry;

  let step: Step =
    isPasswordEntry && hasConfirmedInput && secretInput ? "password" : "input";
  if (phase !== "form") {
    step = phase;
  }

  useEffect(() => {
    isMounted.current = true;
    // A reload keeps { step: "password" } on the entry; drop it so the
    // input step owns this entry again.
    if (isPasswordEntry) {
      navigate(location.pathname, { replace: true, state: null });
    }
    fetchData().catch(() => {
      // The hook keeps the error state; it's rendered below.
    });
    return () => {
      isMounted.current = false;
      clearTimeout(readyTimer.current);
      dispatch(clearApiError());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (step === "importing") {
    return <ImportStatus text={t("Importing your wallet…")} />;
  }

  if (step === "ready") {
    return <ImportStatus text={t("Your wallet is ready!")} />;
  }

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

  const { applicationState } = state.data.account;

  // The wallet is normally erased by the lock screen's "Reset wallet"
  // before anyone gets here. If one still exists (a typed URL or a stale
  // tab), the form warns the user, and importing replaces it rather than
  // mixing its keys with the imported ones.
  const isOverwritingAccount =
    applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED;

  // Background and thunk failures arrive as English strings; anything
  // unrecognized (or empty) falls back to the generic import error.
  const formatImportError = (error: string) => {
    if (INVALID_INPUT_ERRORS.includes(error)) {
      return t("Enter a valid recovery phrase or secret key");
    }
    if (error === "The phrase you entered is incorrect") {
      return t("The phrase you entered is incorrect");
    }
    return t("Error importing account");
  };

  // There's no Paste button: extension pages can't read the clipboard
  // without the clipboardRead permission. A keyboard paste lands in the
  // textarea natively; afterwards the clipboard is cleared.
  const handleKeyboardPaste = async () => {
    try {
      await navigator.clipboard.writeText("");
    } catch (e) {
      // Nothing to do if the clipboard can't be written.
    }
  };

  const handleNext = () => {
    if (parseImportSecret(secretInput).type === "invalid") {
      setInputError(t("Enter a valid recovery phrase or secret key"));
      return;
    }
    setInputError("");
    setHasConfirmedInput(true);
    // PasswordForm shows the stored auth error on its fields.
    dispatch(clearApiError());
    navigate(location.pathname, { state: { step: "password" } });
  };

  // Back to the text box with an error. Only pop history when the current
  // entry is the password one this view pushed; otherwise popping would
  // leave the import route.
  const returnToInput = (error: string) => {
    setInputError(error);
    setHasConfirmedInput(false);
    setPhase("form");
    if (isPasswordEntryRef.current) {
      navigate(-1);
    }
  };

  const handleImport = async (values: FormValues) => {
    if (isImporting.current) {
      return;
    }
    const parsed = parseImportSecret(secretInput);
    if (parsed.type === "invalid") {
      returnToInput(t("Enter a valid recovery phrase or secret key"));
      return;
    }
    isImporting.current = true;
    setPhase("importing");

    try {
      const res =
        parsed.type === "phrase"
          ? await dispatch(
              recoverAccount({
                password: values.password,
                mnemonicPhrase: parsed.mnemonic,
                isOverwritingAccount,
              }),
            )
          : await dispatch(
              recoverAccountFromSecretKey({
                password: values.password,
                secretKey: parsed.secretKey,
                isOverwritingAccount,
              }),
            );
      if (!isMounted.current) {
        return;
      }

      if (
        recoverAccount.fulfilled.match(res) ||
        recoverAccountFromSecretKey.fulfilled.match(res)
      ) {
        setSecretInput("");
        try {
          await fetchData();
        } catch (e) {
          // The account is stored; the next screen loads its own data.
        }
        if (!isMounted.current) {
          return;
        }
        setPhase("ready");
        readyTimer.current = setTimeout(() => {
          navigateTo(ROUTES.recoverAccountSuccess, navigate);
        }, READY_SCREEN_MS);
        return;
      }

      returnToInput(formatImportError(res.payload?.errorMessage || ""));
    } finally {
      isImporting.current = false;
    }
  };

  if (step === "password") {
    return (
      <View.Content alignment="center" hasNoTopPadding hasNoBottomPadding>
        <Formik
          initialValues={initialValues}
          validationSchema={RecoverAccountSchema}
          onSubmit={handleImport}
        >
          {({ dirty, touched, isSubmitting, isValid, errors, values }) => (
            <PasswordForm
              isValid={isValid}
              dirty={dirty}
              isSubmitting={isSubmitting}
              errors={errors}
              touched={touched}
              values={values}
              isShowingOverwriteWarning={isOverwritingAccount}
            />
          )}
        </Formik>
      </View.Content>
    );
  }

  return (
    <View.Content alignment="center" hasNoTopPadding hasNoBottomPadding>
      <div className="RecoverAccount">
        <Onboarding layout="half">
          <Card variant="secondary">
            <div className="RecoverAccount__body">
              <BackButton
                customBackAction={() => {
                  setSecretInput("");
                  navigateTo(ROUTES.welcome, navigate);
                }}
              />
              <div className="RecoverAccount__titles">
                <Heading as="h2" size="xs" weight="semi-bold">
                  {t("Import Wallet")}
                </Heading>
                <Text as="p" size="md">
                  {t(
                    "Import your wallet using a recovery phrase or secret key",
                  )}
                </Text>
              </div>
              <div className="RecoverAccount__field">
                <Textarea
                  fieldSize="md"
                  id="import-secret"
                  data-testid="import-secret-input"
                  className={
                    isInputVisible ? "" : "RecoverAccount__input--masked"
                  }
                  placeholder={t("Enter your recovery phrase or secret key")}
                  rows={5}
                  value={secretInput}
                  isError={Boolean(inputError)}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(e) => {
                    setSecretInput(e.target.value);
                    setInputError("");
                    setHasConfirmedInput(false);
                  }}
                  onPaste={handleKeyboardPaste}
                />
                <div className="RecoverAccount__visibility">
                  <Button
                    variant="tertiary"
                    size="sm"
                    type="button"
                    data-testid="import-secret-visibility"
                    aria-label={isInputVisible ? t("Hide") : t("Show")}
                    aria-pressed={isInputVisible}
                    onClick={() => setIsInputVisible(!isInputVisible)}
                    icon={isInputVisible ? <Icon.EyeOff /> : <Icon.Eye />}
                  />
                </div>
              </div>
              <Button
                size="lg"
                variant="secondary"
                isFullWidth
                type="button"
                data-testid="import-secret-next"
                disabled={secretInput.trim() === ""}
                onClick={handleNext}
              >
                {t("Next")}
              </Button>
            </div>
          </Card>
          <OnboardingError errorString={inputError} />
        </Onboarding>
      </div>
    </View.Content>
  );
};
