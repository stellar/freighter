import React, { useState } from "react";
import styled from "styled-components";
import { Formik } from "formik";
import { useSelector, useDispatch } from "react-redux";
import {
  confirmMnemonicPhrase,
  authErrorSelector,
} from "popup/ducks/authServices";
import Form from "popup/components/Form";
import { ApiErrorMessage } from "popup/components/Form/basics";
import { COLOR_PALETTE } from "popup/styles";
import { Button } from "popup/styles/Basics";
import CheckButton from "./basics/CheckButton";

const ConfirmInput = styled.div`
  background: #d2d8e5;
  border: 0;
  border-radius: 30px;
  box-sizing: border-box;
  color: ${COLOR_PALETTE.primary};
  font-size: 1.125rem;
  height: 160px;
  padding: 2.3rem;
  resize: none;
  width: 100%;
  margin-bottom: 20px;
  text-align: center;
`;

const ClearButton = styled(Button)`
  background: ${COLOR_PALETTE.primaryGradient};
  border-radius: 7px;
  color: #fff;
  font-weight: 800;
  height: 24px;
  margin-left: 7px;
  width: 24px;
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
          <Form
            formCTA="Confirm"
            isSubmitting={isSubmitting}
            isValid={!!displaySelectedWords().length}
          >
            <>
              <div>
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
              </div>
              {wordBubbles(handleChange)}
            </>
          </Form>
        )}
      </Formik>
    </>
  );
};

export default ConfirmMnemonicPhrase;
