import React, { useState } from "react";
import { Redirect } from "react-router-dom";
import styled from "styled-components";
import { Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  confirmMnemonicPhrase,
  authErrorSelector,
  applicationStateSelector,
} from "popup/ducks/authServices";

import CloseIcon from "popup/assets/icon-close.svg";

import { ROUTES } from "popup/constants/routes";
import { COLOR_PALETTE } from "popup/constants/styles";
import { Button } from "popup/basics/Buttons";
import {
  Form,
  SubmitButton,
  ApiErrorMessage,
  FormRow,
} from "popup/basics/Forms";

import { HalfScreen } from "popup/components/Onboarding";
import { CheckButton } from "./CheckButton";

const ConfirmInputEl = styled.div`
  background: ${COLOR_PALETTE.inputBackground};
  border: 0;
  border-radius: 1.875rem;
  box-sizing: border-box;
  color: ${COLOR_PALETTE.primary};
  font-size: 1.125rem;
  height: 160px;
  padding: 2.3rem;
  resize: none;
  width: 100%;
  margin-bottom: 1.25rem;
  text-align: center;
`;

const ClearButtonEl = styled(Button)`
  border-radius: 0.5rem;
  display: inline-block;
  height: 1.5rem;
  margin: 0 0 0 0.5rem;
  padding: 0;
  width: 1.5rem;

  img {
    width: 0.5rem;
  }
`;

const WordBubbleWrapperEl = styled.div`
  display: flex;
  flex-flow: wrap;
  justify-content: flex-start;
  padding-bottom: 3rem;
`;

const ModifiedHalfScreenEl = styled(HalfScreen)`
  padding: 0;
  padding-left: 5rem;
  width: 31rem;
`;

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

  interface Values {
    [x: string]: boolean;
  }

  const removeLastWord = (
    values: Values,
    setValues: (valuesToSet: Values) => void,
  ) => {
    const lastWord = selectedWords.slice(-1)[0];
    setValues({ ...values, [lastWord as string]: false });
    setSelectedWords((prevState) => prevState.slice(0, prevState.length - 1));
  };

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
      <Formik initialValues={initialWordState} onSubmit={handleSubmit}>
        {({ setValues, values, isSubmitting, handleChange }) => (
          <Form>
            <ModifiedHalfScreenEl>
              <ConfirmInputEl>
                {displaySelectedWords()}
                {selectedWords.length ? (
                  <ClearButtonEl
                    type="button"
                    onClick={() => removeLastWord(values, setValues)}
                  >
                    <img src={CloseIcon} alt="clear icon" />
                  </ClearButtonEl>
                ) : null}
              </ConfirmInputEl>
              <ApiErrorMessage error={authError}></ApiErrorMessage>
              <WordBubbleWrapperEl>
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
              </WordBubbleWrapperEl>
              <FormRow>
                <SubmitButton
                  isSubmitting={isSubmitting}
                  isValid={!!displaySelectedWords().length}
                >
                  Confirm
                </SubmitButton>
              </FormRow>
            </ModifiedHalfScreenEl>
          </Form>
        )}
      </Formik>
    </>
  );
};
