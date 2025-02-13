import React from "react";
import { Field } from "formik";

import "./styles.scss";

type CheckButtonProps = {
  onChange: (e: any) => void;
  onKeyDown?: (e: any) => void;
  wordKey: string;
  word: string;
  wordNumber: () => string;
  wordIndex: string;
};

export const CheckButton = ({
  onChange,
  onKeyDown,
  wordKey,
  word,
  wordNumber,
  wordIndex,
}: CheckButtonProps) => (
  <div className="CheckButton__wrapper">
    <Field
      className="CheckButton"
      id={wordIndex}
      onChange={(e: React.FormEvent) => onChange(e)}
      type="checkbox"
      name={wordIndex}
      text={word}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (onKeyDown) {
          onKeyDown(e);
        }
      }}
      value={wordKey}
    />
    <label className="ButtonLabel" htmlFor={wordIndex}>
      <div className="ButtonLabel__number">{wordNumber()}</div>{" "}
      <div className="ButtonLabel__word">{word}</div>
    </label>
  </div>
);
