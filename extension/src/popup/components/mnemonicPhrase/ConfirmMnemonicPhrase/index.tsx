import React, { useState } from "react";
import { Form, Formik, FormikHelpers, FormikValues } from "formik";
import { useSelector, useDispatch } from "react-redux";
import { Button, Card } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  confirmMnemonicPhrase,
  authErrorSelector,
} from "popup/ducks/accountServices";
import { FormError, SubmitButtonWrapper } from "popup/basics/Forms";

import {
  OnboardingScreen,
  OnboardingHeader,
} from "popup/components/Onboarding";
import { generateMnemonicPhraseDisplay } from "popup/components/mnemonicPhrase/MnemonicDisplay";

import { CheckButton } from "../CheckButton";

import "./styles.scss";

const convertToWord = (wordKey: string) => wordKey.replace(/-.*/, "");

export const ConfirmMnemonicPhrase = ({
  words = [""],
}: {
  words: string[];
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

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
      return setSelectedWords((prevState) => [...prevState, target.name]);
    }
    return setSelectedWords((prevState) => {
      const currentArr = [...prevState];
      currentArr.splice(currentArr.indexOf(target.name), 1);
      return [...currentArr];
    });
  };

  const wordStateArr: [string, boolean][] = Object.entries(initialWordState);

  const handleSubmit = (
    _values: FormikValues,
    formikHelpers: FormikHelpers<FormikValues>,
  ): void => {
    dispatch(confirmMnemonicPhrase(joinSelectedWords()));
    setSelectedWords([]);
    formikHelpers.resetForm();
  };

  const joinSelectedWords = () =>
    selectedWords.map((word) => convertToWord(word)).join(" ");

  return (
    <>
      <OnboardingScreen
        className="ConfirmMnemonicPhrase__screen"
        data-testid="ConfirmMnemonicPhrase"
      >
        <OnboardingHeader className="ConfirmMnemonicPhrase__header">
          {t("Confirm your recovery phrase")}
        </OnboardingHeader>
        <div className="ConfirmMnemonicPhrase__content">
          <p>{t("Please select each word in the same order you have")}</p>
          <p>{t("them noted to confirm you got them right")}</p>
        </div>
        <Formik initialValues={initialWordState} onSubmit={handleSubmit}>
          {({ dirty, isSubmitting, handleChange }) => (
            <Form className="ConfirmMnemonicPhrase--form-wrapper">
              <div className="ConfirmMnemonicPhrase__selected-words-wrapper">
                <Card variant="secondary">
                  <ul
                    className="ConfirmMnemonicPhrase__selected-words-text"
                    onCopy={(e) => e.preventDefault()}
                  >
                    {generateMnemonicPhraseDisplay({
                      mnemonicPhrase: joinSelectedWords(),
                    })}
                  </ul>
                </Card>
              </div>
              <FormError>{authError}</FormError>
              <div className="ConfirmMnemonicPhrase__word-bubble-wrapper">
                {wordStateArr.map(([wordKey]) => (
                  <CheckButton
                    key={wordKey}
                    onChange={(e) => {
                      handleChange(e);
                      updatePhrase(e.target);
                    }}
                    wordKey={wordKey}
                    word={convertToWord(wordKey)}
                  />
                ))}
              </div>
              <SubmitButtonWrapper>
                <Button
                  size="md"
                  data-testid="display-mnemonic-phrase-confirm-btn"
                  isFullWidth
                  variant="primary"
                  type="submit"
                  disabled={!dirty && !!joinSelectedWords().length}
                  isLoading={isSubmitting}
                >
                  {t("Next")}
                </Button>
              </SubmitButtonWrapper>
            </Form>
          )}
        </Formik>
      </OnboardingScreen>
    </>
  );
};
