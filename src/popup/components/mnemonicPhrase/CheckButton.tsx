import React from "react";
import styled from "styled-components";
import { Field } from "formik";
import { COLOR_PALETTE } from "popup/constants/styles";

type CheckButtonProps = {
  onChange: (e: any) => void;
  wordKey: string;
  word: string;
};
const ButtonLabel = styled.label`
  border: 1px solid ${COLOR_PALETTE.primary};
  border-radius: 1rem;
  color: ${COLOR_PALETTE.primary};
  cursor: pointer;
  display: inline-block;
  font-weight: 800;
  font-size: 0.75rem;
  margin: 3px;
  padding: 0.7rem 1.75rem;
`;

const CheckBox = styled(Field)`
  display: none;

  &:checked + ${ButtonLabel} {
    background: ${COLOR_PALETTE.primary};
    color: white;
  }
`;

export const CheckButton = ({ onChange, wordKey, word }: CheckButtonProps) => (
  <>
    <CheckBox
      id={wordKey}
      onChange={(e: React.FormEvent) => onChange(e)}
      type="checkbox"
      name={wordKey}
      key={wordKey}
      text={word}
    />
    <ButtonLabel htmlFor={wordKey}>{word}</ButtonLabel>
  </>
);
