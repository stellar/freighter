import React from "react";
import { Field } from "formik";

import "./styles.scss";

type CheckButtonProps = {
  onChange: (e: any) => void;
  onKeyDown?: (e: any) => void;
  wordKey: string;
  word: string;
};

export const CheckButton = ({
  onChange,
  onKeyDown,
  wordKey,
  word,
}: CheckButtonProps) => (
  <span>
    <Field
      className="CheckButton"
      id={wordKey}
      onChange={(e: React.FormEvent) => onChange(e)}
      type="checkbox"
      name={wordKey}
      key={wordKey}
      text={word}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (onKeyDown) {
          onKeyDown(e);
        }
      }}
    />
    <label className="ButtonLabel" htmlFor={wordKey} data-testid={word}>
      {word}
    </label>
  </span>
);
