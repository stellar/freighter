import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input } from "@stellar/design-system";
import { Field, Form, Formik, FieldProps } from "formik";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";

import { FormRows } from "popup/basics/Forms";
import { View } from "popup/basics/layout/View";

import { SubviewHeader } from "popup/components/SubviewHeader";

import {
  addAccount,
  authErrorSelector,
  clearApiError,
} from "popup/ducks/accountServices";

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
        // eslint-disable-next-line @typescript-eslint/naming-convention
        number_of_accounts: res.payload.allAccounts.length,
      });
      navigateTo(ROUTES.account);
    }
  };

  useEffect(
    () => () => dispatch(clearApiError()) as unknown as void,
    [dispatch],
  );

  return (
    <React.Fragment>
      <SubviewHeader title="Add a new Stellar address" />
      <Formik initialValues={initialValues} onSubmit={handleSubmit}>
        {({ dirty, isSubmitting, isValid, errors, touched }) => (
          <Form className="View__contentAndFooterWrapper">
            <View.Content>
              <FormRows>
                <Field name="password">
                  {({ field }: FieldProps) => (
                    <Input
                      fieldSize="md"
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
              </FormRows>
            </View.Content>
            <View.Footer>
              <Button
                size="md"
                isFullWidth
                variant="primary"
                disabled={!(dirty && isValid)}
                isLoading={isSubmitting}
                type="submit"
              >
                {t("Add New Address")}
              </Button>
            </View.Footer>
          </Form>
        )}
      </Formik>
    </React.Fragment>
  );
};
