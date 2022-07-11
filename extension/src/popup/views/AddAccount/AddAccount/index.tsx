import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Input } from "@stellar/design-system";
import { Field, Form, Formik, FieldProps } from "formik";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { Button } from "popup/basics/buttons/Button";
import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";

import { FormRows, SubmitButtonWrapper } from "popup/basics/Forms";
import { PopupWrapper } from "popup/basics/PopupWrapper";

import { SubviewHeader } from "popup/components/SubviewHeader";

import { addAccount, authErrorSelector } from "popup/ducks/accountServices";

import "./styles.scss";

interface FormValues {
  password: string;
}

const initialValues: FormValues = {
  password: "",
};

export const AddAccount = () => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const authError = useSelector(authErrorSelector);

  const handleSubmit = async (values: FormValues) => {
    const { password } = values;

    const res = await dispatch(addAccount(password));

    if (addAccount.fulfilled.match(res)) {
      emitMetric(METRIC_NAMES.accountScreenAddAccount, {
        number_of_accounts: res.payload.allAccounts.length,
      });
      navigateTo(ROUTES.account);
    }
  };

  return (
    <>
      <PopupWrapper>
        <SubviewHeader title="Add a new Stellar address" />
        <Formik initialValues={initialValues} onSubmit={handleSubmit}>
          {({ dirty, isSubmitting, isValid, errors, touched }) => (
            <Form>
              <FormRows>
                <Field name="password">
                  {({ field }: FieldProps) => (
                    <Input
                      autoComplete="off"
                      id="password-input"
                      placeholder={t("Enter Password")}
                      type="password"
                      error={
                        authError ||
                        (errors.password && touched.password
                          ? errors.password
                          : "")
                      }
                      {...field}
                    />
                  )}
                </Field>
                <SubmitButtonWrapper>
                  <Button
                    fullWidth
                    disabled={!(dirty && isValid)}
                    isLoading={isSubmitting}
                    type="submit"
                  >
                    {t("Add New Address")}
                  </Button>
                </SubmitButtonWrapper>
              </FormRows>
            </Form>
          )}
        </Formik>
      </PopupWrapper>
    </>
  );
};
