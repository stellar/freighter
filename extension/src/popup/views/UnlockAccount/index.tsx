import React from "react";
import get from "lodash/get";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Field, Form, Formik, FieldProps } from "formik";
import { Input, TextLink } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { Button } from "popup/basics/buttons/Button";
import { ROUTES } from "popup/constants/routes";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { FormRows, SubmitButtonWrapper } from "popup/basics/Forms";
import { Header } from "popup/components/Header";
import {
  confirmPassword,
  authErrorSelector,
} from "popup/ducks/accountServices";

import "./styles.scss";

export const UnlockAccount = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const from = get(location, "state.from.pathname", "") as ROUTES;
  const queryParams = get(location, "search", "");
  const destination = from || ROUTES.account;

  const dispatch = useDispatch();
  const authError = useSelector(authErrorSelector);

  interface FormValues {
    password: string;
  }
  const initialValues: FormValues = {
    password: "",
  };

  const handleSubmit = async (values: FormValues) => {
    const { password } = values;
    await dispatch(confirmPassword(password));
    navigateTo(destination, queryParams);
  };

  return (
    <div className="UnlockAccount">
      <Header isPopupView />
      <div className="UnlockAccount__header">
        {t("A Stellar wallet for every website")}
      </div>
      <Formik onSubmit={handleSubmit} initialValues={initialValues}>
        {({ dirty, isSubmitting, isValid, errors, touched }) => (
          <Form>
            <div>
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
              </FormRows>
              <SubmitButtonWrapper>
                <Button
                  fullWidth
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={!(dirty && isValid)}
                >
                  {t("LOG IN")}
                </Button>
              </SubmitButtonWrapper>
            </div>
          </Form>
        )}
      </Formik>
      <div className="UnlockAccount__import-account">
        <div>{t("Want to add another account?")}</div>
        <div>
          <TextLink
            variant={TextLink.variant.secondary}
            onClick={() => {
              openTab(newTabHref(ROUTES.recoverAccount));
            }}
          >
            {t("Import using account seed phrase")}
          </TextLink>
        </div>
      </div>
    </div>
  );
};
