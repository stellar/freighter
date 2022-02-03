import React from "react";
import { Field } from "formik";

import "./styles.scss";

type CheckButtonProps = {
  onChange: (e: any) => void;
  wordKey: string;
  word: string;
};

export const CheckButton = ({ onChange, wordKey, word }: CheckButtonProps) => (
  <>
    <Field
      className="CheckButton"
      id={wordKey}
      onChange={(e: React.FormEvent) => onChange(e)}
      type="checkbox"
      name={wordKey}
      key={wordKey}
      text={word}
    />
    <label className="ButtonLabel" htmlFor={wordKey}>
      {word}
    </label>
  </>
);
