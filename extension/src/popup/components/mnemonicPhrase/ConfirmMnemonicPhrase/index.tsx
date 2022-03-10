import React, { useState } from "react";
import { Redirect } from "react-router-dom";
import { Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";
import { Button, Card } from "@stellar/design-system";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  confirmMnemonicPhrase,
  authErrorSelector,
  applicationStateSelector,
} from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import { Form, FormError, SubmitButtonWrapper } from "popup/basics/Forms";

import {
  OnboardingScreen,
  OnboardingHeader,
} from "popup/components/Onboarding";

import { CheckButton } from "../CheckButton";

import "./styles.scss";

const convertToWord = (wordKey: string) => wordKey.replace(/-.*/, "");

export const ConfirmMnemonicPhrase = ({
  words = [""],
}: {
  words: string[];
}) => {
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
    await dispatch(confirmMnemonicPhrase(displaySelectedWords()));
  };

  const displaySelectedWords = () =>
    selectedWords.map((word) => convertToWord(word)).join(" ");

  if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
    return <Redirect to={ROUTES.mnemonicPhraseConfirmed} />;
  }

  return (
    <>
      <OnboardingScreen className="ConfirmMnemonicPhrase__screen">
        <OnboardingHeader className="ConfirmMnemonicPhrase__header">
          Confirm your recovery phrase
        </OnboardingHeader>
        <div className="ConfirmMnemonicPhrase__content">
          <p>Please select each word in the same order you have</p>
          <p>them noted to confirm you go them right</p>
        </div>
        <Formik initialValues={initialWordState} onSubmit={handleSubmit}>
          {({ dirty, isSubmitting, handleChange }) => (
            <Form className="ConfirmMnemonicPhrase--form-wrapper">
              <div className="ConfirmMnemonicPhrase__selected-words-wrapper">
                <Card variant={Card.variant.highlight}>
                  <span className="ConfirmMnemonicPhrase__selected-words-text">
                    {displaySelectedWords()}
                  </span>
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
                  fullWidth
                  type="submit"
                  disabled={!dirty && !!displaySelectedWords().length}
                  isLoading={isSubmitting}
                >
                  NEXT
                </Button>
              </SubmitButtonWrapper>
            </Form>
          )}
        </Formik>
      </OnboardingScreen>
    </>
  );
};
