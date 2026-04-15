import React, { useCallback, useEffect, useState } from "react";
import { useFormikContext } from "formik";
import { Banner } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import debounce from "lodash/debounce";
import isEqual from "lodash/isEqual";

import "./styles.scss";

export interface AutoSaveFieldsProps {
  /**
   * Number of milliseconds to wait after last change before submitting the form
   */
  debounceMs?: number;
}

export const AutoSaveFields = ({ debounceMs = 500 }: AutoSaveFieldsProps) => {
  const { t } = useTranslation();
  const formik = useFormikContext();
  const [didSaveFail, setDidSaveFail] = useState(false);
  const [values, setValues] = useState(formik.values);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (!isEqual(formik.values, values)) {
        setValues(formik.values);
        debouncedSubmit(formik);
      }
    }
  }, [
    debouncedSubmit,
    formik,
    formik.values,
    formik.dirty,
    formik.isSubmitting,
    formik.isValid,
    values,
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
      <Banner variant="error">{t("Save failed!")}</Banner>
    </div>
  );
};
