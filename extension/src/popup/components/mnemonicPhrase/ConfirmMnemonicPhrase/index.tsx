import React, { useState } from "react";
import { Redirect } from "react-router-dom";
import { Form, Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";
import { Card } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  confirmMnemonicPhrase,
  authErrorSelector,
  applicationStateSelector,
} from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import { FormError, SubmitButtonWrapper } from "popup/basics/Forms";
import { Button } from "popup/basics/buttons/Button";

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
  const applicationState = useSelector(applicationStateSelector);

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

  const handleSubmit = async () => {
    await dispatch(confirmMnemonicPhrase(joinSelectedWords()));
    setSelectedWords([]);
  };

  const joinSelectedWords = () =>
    selectedWords.map((word) => convertToWord(word)).join(" ");

  if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
    return <Redirect to={ROUTES.mnemonicPhraseConfirmed} />;
  }

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
          <p>{t("them noted to confirm you go them right")}</p>
        </div>
        <Formik initialValues={initialWordState} onSubmit={handleSubmit}>
          {({ dirty, isSubmitting, handleChange }) => (
            <Form className="ConfirmMnemonicPhrase--form-wrapper">
              <div className="ConfirmMnemonicPhrase__selected-words-wrapper">
                <Card variant={Card.variant.highlight}>
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
                  data-testid="display-mnemonic-phrase-confirm-btn"
                  fullWidth
                  type="submit"
                  disabled={!dirty && !!joinSelectedWords().length}
                  isLoading={isSubmitting}
                >
                  {t("NEXT")}
                </Button>
              </SubmitButtonWrapper>
            </Form>
          )}
        </Formik>
      </OnboardingScreen>
    </>
  );
};
