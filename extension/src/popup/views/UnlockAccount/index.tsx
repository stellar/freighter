import React from "react";
import get from "lodash/get";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useHistory } from "react-router-dom";
import { Field, Form, Formik, FieldProps } from "formik";
import { Button, Heading, Input } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { FormRows, SubmitButtonWrapper } from "popup/basics/Forms";
import { View } from "popup/basics/layout/View";
import {
  confirmPassword,
  authErrorSelector,
} from "popup/ducks/accountServices";

import "./styles.scss";

export const UnlockAccount = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
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
    // eslint-disable-next-line
    await dispatch(confirmPassword(password));
    // skip this location in history, we won't need to come back here after unlocking account
    history.replace(`${destination}${queryParams}`);
  };

  return (
    <React.Fragment>
      <View.Header />
      <View.Content alignment="center">
        <div className="UnlockAccount">
          <Heading as="h1" size="lg">
            {t("A Stellar wallet for every website")}
          </Heading>
          <Formik onSubmit={handleSubmit} initialValues={initialValues}>
            {({ dirty, isSubmitting, isValid, errors, touched }) => (
              <Form>
                <div>
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
                  <SubmitButtonWrapper>
                    <Button
                      size="md"
                      isFullWidth
                      variant="secondary"
                      type="submit"
                      isLoading={isSubmitting}
                      disabled={!(dirty && isValid)}
                    >
                      {t("Log In")}
                    </Button>
                  </SubmitButtonWrapper>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </View.Content>
      <View.Footer hasExtraPaddingBottom customGap="0.25rem">
        <div className="UnlockAccount__footer-label">
          {t("Want to add another account?")}
        </div>

        <Button
          size="md"
          isFullWidth
          variant="tertiary"
          onClick={() => {
            openTab(newTabHref(ROUTES.recoverAccount));
          }}
        >
          {t("Import using account seed phrase")}
        </Button>

        <div className="UnlockAccount__spacer" />

        <Button
          size="md"
          isFullWidth
          variant="tertiary"
          onClick={() => {
            openTab(newTabHref(ROUTES.accountCreator));
          }}
        >
          {t("Create a wallet")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
