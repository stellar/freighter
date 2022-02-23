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
  const [didSaveFail, setDidSaveFail] = useState(false);

  const debouncedSubmit = useCallback(
    debounce(async (ctx: typeof formik) => {
      try {
        await ctx.submitForm();
      } catch (e) {
        console.error(e);
        setDidSaveFail(true);
      }
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
    if (didSaveFail) {
      setTimeout(() => {
        setDidSaveFail(false);
      }, 750);
    }
  }, [didSaveFail]);

  return (
    <div
      className={`AutoSave--status ${
        didSaveFail ? "AutoSave--status--failed" : ""
      }`}
    >
      <StatusBar variant={StatusBar.variant.error}>Save failed!</StatusBar>
    </div>
  );
};
