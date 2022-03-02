import React from "react";
import get from "lodash/get";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { Field, Formik, FieldProps } from "formik";
import { Input, Button, TextLink } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { Form, FormRow } from "popup/basics/Forms";
import { SubviewWrapper } from "popup/basics/AccountSubview";
import { Header } from "popup/components/Header";
import {
  confirmPassword,
  authErrorSelector,
} from "popup/ducks/accountServices";

import "./styles.scss";

export const UnlockAccount = () => {
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
    <SubviewWrapper>
      <Header isPopupView />
      <div className="UnlockAccount__header">
        A <strong>Stellar</strong> wallet for every website
      </div>
      <Formik onSubmit={handleSubmit} initialValues={initialValues}>
        {({ dirty, isSubmitting, isValid, errors, touched }) => (
          <Form>
            <div>
              <FormRow>
                <Field name="password">
                  {({ field }: FieldProps) => (
                    <Input
                      autoComplete="off"
                      id="password-input"
                      placeholder="Enter Password"
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
              </FormRow>
              <div className="UnlockAccount__button-row">
                <Button
                  fullWidth
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={!(dirty && isValid)}
                >
                  LOG IN
                </Button>
              </div>
            </div>
          </Form>
        )}
      </Formik>
      <div className="UnlockAccount__import-account">
        <div>Want to add another account?</div>
        <div>
          <TextLink
            variant={TextLink.variant.secondary}
            onClick={() => {
              openTab(newTabHref(ROUTES.recoverAccount));
            }}
          >
            Import using account seed phrase
          </TextLink>
        </div>
      </div>
    </SubviewWrapper>
  );
};
