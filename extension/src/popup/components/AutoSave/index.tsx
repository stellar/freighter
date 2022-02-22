import React, { useCallback, useEffect, useState } from "react";
import { useFormikContext } from "formik";
import { StatusBar } from "@stellar/design-system";
import debounce from "lodash/debounce";

import "./styles.scss";

export interface AutoSaveFieldsProps {
  /**
   * Number of milliseconds to wait after last change before submitting the form
   */
  debounceMs?: number;
}

export const AutoSaveFields = ({ debounceMs = 500 }: AutoSaveFieldsProps) => {
  const formik = useFormikContext();
  const [isSaveSuccessful, setIsSaveSuccessful] = useState(false);

  const debouncedSubmit = useCallback(
    debounce(async (ctx: typeof formik) => {
      try {
        await ctx.submitForm();
      } catch (e) {
        console.error(e);
      }

      setIsSaveSuccessful(true);
    }, debounceMs),
    [formik.submitForm, debounceMs],
  );

  useEffect(() => {
    if (formik.isValid && formik.dirty && !formik.isSubmitting) {
      debouncedSubmit(formik);
    }
  }, [
    debouncedSubmit,
    formik,
    formik.values,
    formik.dirty,
    formik.isSubmitting,
    formik.isValid,
  ]);

  useEffect(() => {
    if (isSaveSuccessful) {
      setTimeout(() => {
        setIsSaveSuccessful(false);
      }, 750);
    }
  }, [isSaveSuccessful]);

  return (
    <div
      className={`AutoSave--status ${
        isSaveSuccessful ? "AutoSave--status--successful" : ""
      }`}
    >
      <StatusBar variant={StatusBar.variant.success}>Saved</StatusBar>
    </div>
  );
};
