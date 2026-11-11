import React, { useEffect, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Button, Textarea } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  isValidImportMnemonic,
  normalizeMnemonic,
} from "@shared/api/helpers/mnemonic";
import { ACCOUNT_ALREADY_EXISTS_ERROR } from "@shared/constants/errors";
import { emitMetric } from "helpers/metrics";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { navigateTo } from "popup/helpers/navigate";
import {
  clearApiError,
  importRecoveryPhrase,
} from "popup/ducks/accountServices";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { ScreenTitle } from "popup/components/ScreenTitle";
import { View } from "popup/basics/layout/View";
import { EnterPassword } from "popup/components/EnterPassword";

import "./styles.scss";

/*
  Import a further recovery phrase into the wallet.

  phrase: the textarea, checked in the popup before anything else happens.
  password: re-authentication before the background stores anything.

  The phrase lives in component state between the steps and is dropped on
  success and when the screen goes away.
*/
type Step = "phrase" | "password";

export const ImportRecoveryPhrase = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const [step, setStep] = useState<Step>("phrase");
  const [phrase, setPhrase] = useState("");
  const [phraseError, setPhraseError] = useState("");
  // EnterPassword's button is disabled while loading, but Enter in the
  // field still submits the form. Two concurrent imports could store the
  // same accounts twice.
  const isImporting = useRef(false);

  useEffect(
    () => () => {
      // Clear any import error so it doesn't show on the next visit.
      dispatch(clearApiError());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const formatAuthError = (error: string) =>
    error === ACCOUNT_ALREADY_EXISTS_ERROR
      ? t("This account is already in your wallet.")
      : error;

  // There's no Paste button: extension pages can't read the clipboard
  // without the clipboardRead permission. A keyboard paste lands in the
  // textarea natively; afterwards the clipboard is cleared, as onboarding
  // recovery does.
  const handleKeyboardPaste = async () => {
    try {
      await navigator.clipboard.writeText("");
    } catch (e) {
      // Nothing to do if the clipboard can't be written.
    }
  };

  const handleImport = () => {
    if (!isValidImportMnemonic(phrase)) {
      setPhraseError(t("Invalid mnemonic phrase"));
      return;
    }
    setPhraseError("");
    setStep("password");
  };

  const handlePassword = async (password: string) => {
    if (isImporting.current) {
      return;
    }
    isImporting.current = true;
    try {
      const res = await dispatch(
        importRecoveryPhrase({
          password,
          mnemonicPhrase: normalizeMnemonic(phrase),
        }),
      );

      if (importRecoveryPhrase.fulfilled.match(res)) {
        emitMetric(METRIC_NAMES.accountCreated, {
          number_of_accounts: res.payload.allAccounts.length,
          source: "imported_phrase",
        });
        setPhrase("");
        navigateTo(ROUTES.account, navigate);
      }
    } finally {
      isImporting.current = false;
    }
  };

  if (step === "password") {
    return (
      <React.Fragment>
        <SubviewHeader
          title=""
          customBackAction={() => {
            dispatch(clearApiError());
            setStep("phrase");
          }}
        />
        <EnterPassword
          onConfirm={handlePassword}
          confirmButtonTitle={t("Import")}
          formatAuthError={formatAuthError}
        />
      </React.Fragment>
    );
  }

  return (
    <React.Fragment>
      <SubviewHeader
        title=""
        customBackAction={() => {
          setPhrase("");
          navigateTo(ROUTES.addWallet, navigate);
        }}
      />
      <View.Content hasNoTopPadding>
        <ScreenTitle
          title={t("Import Recovery Phrase")}
          subtitle={t(
            "Restore your wallet with the 12 or 24-word recovery phrase",
          )}
        />
        <div className="ImportRecoveryPhrase">
          <Textarea
            fieldSize="md"
            id="import-phrase"
            data-testid="import-phrase-input"
            placeholder={t("Recovery phrase")}
            rows={5}
            value={phrase}
            isError={Boolean(phraseError)}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setPhrase(e.target.value);
              setPhraseError("");
            }}
            onPaste={handleKeyboardPaste}
          />
          {/* Same classes the design system's own field error uses. */}
          {phraseError ? (
            <div
              className="FieldNote FieldNote--error FieldNote--md"
              data-testid="import-phrase-error"
            >
              {phraseError}
            </div>
          ) : null}
        </div>
      </View.Content>
      <View.Footer customHeight="auto">
        <Button
          size="lg"
          isFullWidth
          isRounded
          variant="secondary"
          disabled={phrase.trim() === ""}
          onClick={handleImport}
          data-testid="import-phrase-submit"
        >
          {t("Import")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
