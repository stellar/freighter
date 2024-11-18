import { Button, Input } from "@stellar/design-system";
import { Field, Form, Formik, FieldProps } from "formik";
import React, { useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";

import { emitMetric } from "helpers/metrics";

import { AppDispatch } from "popup/App";
import { FormRows } from "popup/basics/Forms";
import { View } from "popup/basics/layout/View";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { navigateTo } from "popup/helpers/navigate";
import { Loading } from "popup/components/Loading";
import { AppError } from "popup/components/AppError";
import { SubviewHeader } from "popup/components/SubviewHeader";
import {
  addAccount,
  authErrorSelector,
  clearApiError,
  hasPrivateKeySelector,
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
  const hasPrivateKey = useSelector(hasPrivateKeySelector);

  // In case a password is not provided here popupMessageListener/addAccount
  // will try to use the existing password value saved in the session store
  const handleAddAccount = useCallback(
    async (password: string = "") => {
      const res = await dispatch(addAccount(password));

      if (addAccount.fulfilled.match(res)) {
        emitMetric(METRIC_NAMES.accountScreenAddAccount, {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          number_of_accounts: res.payload.allAccounts.length,
        });
        navigateTo(ROUTES.account);
      }
    },
    [dispatch],
  );

  const handleEnterPassword = async (values: FormValues) => {
    await handleAddAccount(values.password);
  };

  // If we have a private key we can assume the user password is also saved in
  // the current session store, so no need to ask for it again
  useEffect(() => {
    if (hasPrivateKey) {
      handleAddAccount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => dispatch(clearApiError()) as unknown as void,
    [dispatch],
  );

  // No need to ask for password if it's already stored, so let's just briefly
  // display a loading screen while user is being redirected to next screen
  if (hasPrivateKey) {
    return (
      <React.Fragment>
        <SubviewHeader title="" />
        {!authError && <Loading />}
        {authError && <AppError>{authError}</AppError>}
      </React.Fragment>
    );
  }

  // Ask for user password in case it's not saved in current session store
  return (
    <React.Fragment>
      <SubviewHeader title={t("Add a new Stellar address")} />
      <Formik initialValues={initialValues} onSubmit={handleEnterPassword}>
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
