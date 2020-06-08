import React, { useRef, useState } from "react";
import styled from "styled-components";
import { shuffle } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import {
  confirmMnemonicPhrase,
  authErrorSelector,
} from "popup/ducks/authServices";
import { ErrorMessage1, FormButton } from "popup/components/Form/basics";
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

const ConfirmMnemonicPhrase = ({
  mnemonicPhrase,
}: {
  mnemonicPhrase: string;
}) => {
  const dispatch = useDispatch();
  const words = shuffle(mnemonicPhrase.split(" "));
  const wordState = useRef(
    words.reduce(
      (obj, current, i) => ({
        ...obj,
        [`${current}-${i}`]: false,
      }),
      {},
    ),
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

  const initialWordState = wordState.current;

  const [checkboxState, setCheckboxState] = useState(initialWordState);

  const wordStateArr: [string, boolean][] = Object.entries(checkboxState);

  const wordBubbles = () =>
    wordStateArr.map(([wordKey, value]) => (
      <CheckButton
        onChange={(e) => {
          setCheckboxState((prev) => ({ ...prev, [wordKey]: !value }));
          updatePhrase(e.target);
        }}
        key={wordKey}
        wordKey={wordKey}
        value={value}
        word={wordKey.replace(/-.*/, "")}
      />
    ));

  const clearFields = () => {
    setSelectedWords([]);
    setCheckboxState(initialWordState);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(confirmMnemonicPhrase(selectedWords.join(" ")));
  };
  return (
    <>
      <form onSubmit={handleSubmit}>
        <div>
          <ConfirmInput>
            {selectedWords.join(" ")}
            {selectedWords.length ? (
              <ClearButton type="button" onClick={clearFields}>
                X
              </ClearButton>
            ) : null}
          </ConfirmInput>
          <ErrorMessage1 authError={authError}></ErrorMessage1>
        </div>
        {wordBubbles()}
        <FormButton type="submit">Confirm</FormButton>
      </form>
    </>
  );
};

export default ConfirmMnemonicPhrase;
