import React, { useState } from "react";
import { Redirect } from "react-router-dom";
import { Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  confirmMnemonicPhrase,
  authErrorSelector,
  applicationStateSelector,
} from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import { Form, FormError, FormRow } from "popup/basics/Forms";
import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { BackButton } from "popup/basics/Buttons";

import { Button, Card } from "@stellar/design-system";

import { CheckButton } from "../CheckButton";

import "./styles.scss";

const convertToWord = (wordKey: string) => wordKey.replace(/-.*/, "");

export const ConfirmMnemonicPhrase = ({
  words = [""],
  setReadyToConfirm,
}: {
  words: string[];
  setReadyToConfirm: (readyState: boolean) => void;
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

  const goBack = () => {
    setReadyToConfirm(false);
  };

  const displaySelectedWords = () =>
    selectedWords.map((word) => convertToWord(word)).join(" ");

  if (applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED) {
    return <Redirect to={ROUTES.mnemonicPhraseConfirmed} />;
  }

  return (
    <>
      <FullscreenStyle />
      <BackButton onClick={goBack} />
      <div className="ConfirmMnemonicPhrase__screen">
        <div className="ConfirmMnemonicPhrase__header">
          Confirm your recovery phrase{" "}
        </div>
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
              <FormRow>
                <Button
                  fullWidth
                  type="submit"
                  disabled={!dirty && !!displaySelectedWords().length}
                  isLoading={isSubmitting}
                >
                  NEXT
                </Button>
              </FormRow>
            </Form>
          )}
        </Formik>
      </div>
    </>
  );
};
