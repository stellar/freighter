import React, { useEffect, useState } from "react";
import shuffle from "lodash/shuffle";
import { Form, Formik, FormikHelpers, FormikValues } from "formik";
import { useSelector, useDispatch } from "react-redux";
import { Button, Card, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AppDispatch } from "popup/App";
import {
  confirmMnemonicPhrase,
  confirmMigratedMnemonicPhrase,
  authErrorSelector,
} from "popup/ducks/accountServices";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";

import { OnboardingModal, OnboardingError } from "popup/components/Onboarding";

import { CheckButton } from "../CheckButton";

import "./styles.scss";

const convertToWord = (wordKey: string) => wordKey.replace(/-.*/, "");

export const ConfirmMnemonicPhrase = ({
  mnemonicPhrase,
  isMigration,
}: {
  mnemonicPhrase: string;
  isMigration?: boolean;
}) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const [words, setWords] = useState([""]);

  useEffect(() => {
    if (mnemonicPhrase) {
      setWords(shuffle(mnemonicPhrase.split(" ")));
    }
  }, [mnemonicPhrase]);

  const initialWordState = words.reduce(
    (obj, current, i) => ({
      ...obj,
      // tag each word with an index because words can repeat
      [`${current}-${i}`]: false,
    }),
    {},
  );
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const authError = useSelector(authErrorSelector);

  const updatePhrase = (target: HTMLInputElement) => {
    if (target.checked) {
      return setSelectedWords((prevState) => [...prevState, target.value]);
    }
    return setSelectedWords((prevState) => {
      const currentArr = [...prevState];
      currentArr.splice(currentArr.indexOf(target.value), 1);
      return [...currentArr];
    });
  };

  const wordStateArr: [string, boolean][] = Object.entries(initialWordState);

  const handleSubmit = async (
    _values: FormikValues,
    formikHelpers: FormikHelpers<FormikValues>,
  ): Promise<void> => {
    if (isMigration) {
      const res = await dispatch(
        confirmMigratedMnemonicPhrase(joinSelectedWords()),
      );
      if (confirmMigratedMnemonicPhrase.fulfilled.match(res)) {
        navigateTo(ROUTES.accountMigrationConfirmMigration);
      }
    } else {
      dispatch(confirmMnemonicPhrase(joinSelectedWords()));
    }

    setSelectedWords([]);
    formikHelpers.resetForm();
  };

  const handleSkip = async () => {
    // confirm the mnemonic phrase for the user

    await dispatch(confirmMnemonicPhrase(mnemonicPhrase));
  };

  const joinSelectedWords = () =>
    selectedWords.map((word) => convertToWord(word)).join(" ");

  return (
    <div className="ConfirmMnemonicPhrase">
      <OnboardingModal
        data-testid="confirm-mnemonic-phrase"
        headerText="Confirm Your Recovery Phrase"
        bodyText={
          <>
            <Text as="p" size="md">
              {t(
                "Please select each word in the same order you have them noted to confirm you got them right.",
              )}
            </Text>
          </>
        }
      >
        <Formik initialValues={initialWordState} onSubmit={handleSubmit}>
          {({ dirty, isSubmitting, handleChange }) => (
            <Form>
              <div className="ConfirmMnemonicPhrase__card-wrapper">
                <Card variant="primary">
                  <div className="ConfirmMnemonicPhrase__word-bubble-wrapper">
                    {wordStateArr.map(([wordKey], i) => (
                      <CheckButton
                        wordIndex={`word-${i}`}
                        // eslint-disable-next-line react/no-array-index-key
                        key={i}
                        onChange={(e) => {
                          handleChange(e);
                          updatePhrase(e.target as HTMLInputElement);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.target.checked = e.target.value !== "true";
                            handleChange(e);
                            updatePhrase(e.target as HTMLInputElement);
                          }
                        }}
                        wordKey={wordKey}
                        word={convertToWord(wordKey)}
                        wordNumber={() => {
                          const wordIndex = selectedWords.findIndex(
                            (selectedWord) => selectedWord === wordKey,
                          );

                          if (wordIndex > -1) {
                            return String(wordIndex + 1);
                          }
                          return "";
                        }}
                      />
                    ))}
                  </div>
                </Card>
              </div>
              <div className="ConfirmMnemonicPhrase__footer">
                <div className="ConfirmMnemonicPhrase__footer__buttons">
                  <Button
                    size="lg"
                    data-testid="display-mnemonic-phrase-skip-btn"
                    variant="tertiary"
                    isFullWidth
                    type="button"
                    onClick={handleSkip}
                  >
                    {t("Skip")}
                  </Button>
                  <Button
                    size="lg"
                    data-testid="display-mnemonic-phrase-confirm-btn"
                    variant="secondary"
                    type="submit"
                    disabled={!dirty && !!joinSelectedWords().length}
                    isLoading={isSubmitting}
                    isFullWidth
                  >
                    {t("Confirm")}
                  </Button>
                </div>
                <div>
                  {t(
                    "You can access this later in the app, but we strongly recommend saving this in a safe place.",
                  )}
                </div>
              </div>
            </Form>
          )}
        </Formik>
      </OnboardingModal>
      <OnboardingError
        errorString={authError ? t("Order is incorrect, try again") : ""}
      />
    </div>
  );
};
