import React from "react";
import get from "lodash/get";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useHistory } from "react-router-dom";
import { Field, Form, Formik, FieldProps } from "formik";
import { Button, Text, Input } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { newTabHref } from "helpers/urls";
import { truncatedPublicKey } from "helpers/stellar";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { ROUTES } from "popup/constants/routes";
import { openTab } from "popup/helpers/navigate";
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

  const gAddress = "GBJQABA6Q5GWHVARXAYZALLPABXJITRTO6ZY4L43TY27X6WYB6VLMTXC";

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
          <div className="UnlockAccount__wrapper">
            <div className="UnlockAccount__identicon">
              <IdenticonImg publicKey={gAddress} />
            </div>

            <Text as="div" size="xs" addlClassName="UnlockAccount__gray11">
              {truncatedPublicKey(gAddress)}
            </Text>

            <div className="UnlockAccount__spacer-big" />

            <Text as="div" size="sm">
              {t("Welcome back!")}
            </Text>

            <Text as="div" size="sm" addlClassName="UnlockAccount__gray11">
              {t("Enter password to unlock Freighter")}
            </Text>

            <div className="UnlockAccount__formik">
              <Formik onSubmit={handleSubmit} initialValues={initialValues}>
                {({ dirty, isSubmitting, isValid, errors, touched }) => (
                  <Form>
                    <Field name="password">
                      {({ field }: FieldProps) => (
                        <Input
                          id="password-input"
                          isPassword
                          fieldSize="md"
                          autoComplete="off"
                          placeholder={t("Enter Password")}
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

                    <div className="UnlockAccount__spacer-small" />

                    <Button
                      size="md"
                      isFullWidth
                      variant="secondary"
                      isLoading={isSubmitting}
                      disabled={!(dirty && isValid)}
                    >
                      {t("Login")}
                    </Button>
                  </Form>
                )}
              </Formik>
            </div>
          </div>
        </div>
      </View.Content>

      <View.Footer customGap="0.5rem">
        <div className="UnlockAccount__footer-label UnlockAccount__gray11">
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
