import React from "react";
import styled from "styled-components";
import { Field } from "formik";

type CheckButtonProps = {
  onChange: (e: any) => void;
  wordKey: string;
  word: string;
};
const ButtonLabelEl = styled.label`
  border: 1px solid var(--pal-background-secondary);
  border-radius: 6.25rem;
  color: var(--pal-text-primary);
  cursor: pointer;
  display: inline-block;
  font-weight: var(--font-weight-medium);
  font-size: 0.875rem;
  margin: 3px;
  padding: 0.25rem 1rem;
  text-transform: none;
`;

const CheckBoxEl = styled(Field)`
  display: none;

  &:checked + ${ButtonLabelEl} {
    background: var(--pal-background-secondary);
    color: white;
  }
`;

export const CheckButton = ({ onChange, wordKey, word }: CheckButtonProps) => (
  <>
    <CheckBoxEl
      id={wordKey}
      onChange={(e: React.FormEvent) => onChange(e)}
      type="checkbox"
      name={wordKey}
      key={wordKey}
      text={word}
    />
    <ButtonLabelEl htmlFor={wordKey}>{word}</ButtonLabelEl>
  </>
);
