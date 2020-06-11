import React, { useState } from "react";
import styled from "styled-components";
import { Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";
import {
  confirmMnemonicPhrase,
  authErrorSelector,
} from "popup/ducks/authServices";
import Form from "popup/components/Form";
import { RightColumn } from "popup/components/Layout/Fullscreen/Onboarding";
import { COLOR_PALETTE } from "popup/styles";
import {
  ApiErrorMessage,
  Button,
  FormRow,
  FormSubmitButton,
} from "popup/basics";
import CheckButton from "./basics/CheckButton";

const ConfirmInput = styled.div`
  background: #d2d8e5;
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

const ClearButton = styled(Button)`
  background: ${COLOR_PALETTE.primaryGradient};
  border-radius: 0.5rem;
  color: #fff;
  font-weight: 800;
  height: 1.5rem;
  margin-left: 0.5rem;
  width: 1.5rem;
`;

const WordBubbleWrapper = styled(RightColumn)`
  display: flex;
  flex-flow: wrap;
`;

const convertToWord = (wordKey: string) => wordKey.replace(/-.*/, "");

const ConfirmMnemonicPhrase = ({ words = [""] }: { words: string[] }) => {
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

  const wordBubbles = (handleChange: (e: React.FormEvent) => void) =>
    wordStateArr.map(([wordKey]) => (
      <CheckButton
        key={wordKey}
        onChange={(e) => {
          handleChange(e);
          updatePhrase(e.target);
        }}
        wordKey={wordKey}
        word={convertToWord(wordKey)}
      />
    ));

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

  return (
    <>
      <Formik initialValues={initialWordState} onSubmit={handleSubmit}>
        {({ setValues, values, isSubmitting, handleChange }) => (
          <Form>
            <>
              <RightColumn>
                <ConfirmInput>
                  {displaySelectedWords()}
                  {selectedWords.length ? (
                    <ClearButton
                      type="button"
                      onClick={() => removeLastWord(values, setValues)}
                    >
                      X
                    </ClearButton>
                  ) : null}
                </ConfirmInput>
                <ApiErrorMessage error={authError}></ApiErrorMessage>
              </RightColumn>
              <WordBubbleWrapper>{wordBubbles(handleChange)}</WordBubbleWrapper>
              <FormRow>
                <FormSubmitButton
                  buttonCTA="Confirm"
                  isSubmitting={isSubmitting}
                  isValid={!!displaySelectedWords().length}
                />
              </FormRow>
            </>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default ConfirmMnemonicPhrase;
