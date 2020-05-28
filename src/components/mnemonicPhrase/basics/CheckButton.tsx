import React from "react";
import styled from "styled-components";
import { COLOR_PALETTE } from "styles";

type CheckButtonProps = {
  wordKey: string;
  onChange: (e: any) => void;
  word: string;
  value: boolean;
};
const ButtonLabel = styled.label`
  border: 1px solid ${COLOR_PALETTE.primary};
  border-radius: 1rem;
  color: ${COLOR_PALETTE.primary};
  cursor: pointer;
  display: inline-block;
  font-weight: 800;
  margin: 10px 5px;
  padding: 0.75rem 1.7rem;
`;

const CheckBox = styled.input`
  display: none;

  &:checked + ${ButtonLabel} {
    background: ${COLOR_PALETTE.primary};
    color: white;
  }
`;

const CheckButton = ({ wordKey, onChange, word, value }: CheckButtonProps) => {
  return (
    <>
      <CheckBox
        checked={value}
        id={wordKey}
        type="checkbox"
        onChange={onChange}
        key={wordKey}
        value={word}
      />
      <ButtonLabel htmlFor={wordKey}>{word}</ButtonLabel>
    </>
  );
};

export default CheckButton;
