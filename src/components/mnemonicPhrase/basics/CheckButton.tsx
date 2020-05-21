import React from "react";
import styled from "styled-components";

type CheckButtonProps = {
  onChange: (e: any) => void;
  word: string;
};
const ButtonLabel = styled.label`
  border: 1px solid purple;
  border-radius: 5px;
  color: purple;
  display: inline-block;
  margin: 10px 20px;
  padding: 5px 10px;
`;

const CheckBox = styled.input`
  display: none;

  &:checked + ${ButtonLabel} {
    background: purple;
    color: white;
  }
`;

const CheckButton = ({ onChange, word }: CheckButtonProps) => (
  <>
    <CheckBox
      id={`id-${word}`}
      type="checkbox"
      onChange={onChange}
      key={`key-${word}`}
      value={word}
    />
    <ButtonLabel htmlFor={`id-${word}`}>{word}</ButtonLabel>
  </>
);

export default CheckButton;
