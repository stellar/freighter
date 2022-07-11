import React from "react";
import get from "lodash/get";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { Formik, Form, Field, FieldProps } from "formik";
import { Input } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import {
  confirmPassword,
  authErrorSelector,
} from "popup/ducks/accountServices";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { Button } from "popup/basics/buttons/Button";
import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

interface VerifyAccountProps {
  isApproval?: boolean;
  customBackAction?: () => void;
  customSubmit?: (password: string) => Promise<void>;
}

export const VerifyAccount = ({
  isApproval,
  customBackAction,
  customSubmit,
}: VerifyAccountProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch();
  const authError = useSelector(authErrorSelector);
  const from = get(location, "state.from.pathname", "") as ROUTES;

  const handleSubmit = async (values: { password: string }) => {
    if (customSubmit) {
      await customSubmit(values.password);
    } else {
      await dispatch(confirmPassword(values.password));
      navigateTo(from || ROUTES.account);
    }
  };

  return (
    <PopupWrapper>
      <SubviewHeader
        title={t("Verification")}
        customBackAction={customBackAction}
      />
      <div className="VerifyAccount__copy">
        {isApproval
          ? t("Enter your account password to verify your account.")
          : t(
              "Enter your account password to authorize this transaction.",
            )}{" "}
        You won’t be asked to do this for the next 24 hours.
      </div>
      <Formik initialValues={{ password: "" }} onSubmit={handleSubmit}>
        {({ dirty, isValid, isSubmitting, errors, touched }) => (
          <Form>
            <Field name="password">
              {({ field }: FieldProps) => (
                <Input
                  id="password-input"
                  type="password"
                  placeholder={t("Enter password")}
                  error={
                    authError ||
                    (errors.password && touched.password ? errors.password : "")
                  }
                  {...field}
                />
              )}
            </Field>
            <div className="VerifyAccount__btn-continue">
              <Button
                fullWidth
                isLoading={isSubmitting}
                disabled={!(dirty && isValid)}
              >
                {isApproval ? t("Approve") : t("Submit")}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </PopupWrapper>
  );
};
