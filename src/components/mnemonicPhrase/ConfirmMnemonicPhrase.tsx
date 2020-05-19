import React, { useRef, useState } from "react";
import styled from "styled-components";
import { shuffle } from "lodash";
import { useDispatch, useSelector } from "react-redux";
import { confirmMnemonicPhrase, authErrorSelector } from "ducks/authServices";
import CheckButton from "./primitives/CheckButton";

const ConfirmInput = styled.textarea`
  background: #d3d3d3;
  border: 0;
  border-radius: 5px;
  color: purple;
  font-size: 14px;
  padding: 20px 30px;
  width: 60%;
  margin-bottom: 20px;
`;

const ConfirmMnemonicPhrase = ({
  mnemonicPhrase,
  setReadyToConfirm,
}: {
  mnemonicPhrase: string;
  setReadyToConfirm: (readyToConfirm: boolean) => void;
}) => {
  const dispatch = useDispatch();
  const words = useRef(shuffle(mnemonicPhrase.split(" ")));
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

  const wordBubbles = () =>
    words.current.map((word) => (
      <CheckButton
        onChange={(e) => {
          updatePhrase(e.target);
        }}
        word={word}
      />
    ));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(confirmMnemonicPhrase(selectedWords.join(" ")));
  };
  return (
    <>
      <form onSubmit={handleSubmit}>
        <div>
          <ConfirmInput readOnly value={selectedWords.join(" ")} />
          {authError ? <p>{authError}</p> : null}
        </div>
        {wordBubbles()}
        <div>
          <button type="submit">Confirm</button>
        </div>
        <div>
          <button onClick={() => setReadyToConfirm(false)}>Go back</button>
        </div>
      </form>
    </>
  );
};

export default ConfirmMnemonicPhrase;
