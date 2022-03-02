import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Form, Field, FieldProps, Formik } from "formik";
import { bool as YupBool, object as YupObject, string as YupString } from "yup";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";

import { PopupWrapper } from "popup/basics/PopupWrapper";

// import { SubviewHeader, SubviewWrapper } from "popup/basics/AccountSubview";
// import {
//   ApiErrorMessage,
//   Error,
//   Form,
//   FormRow,
//   CheckboxField,
//   TextField,
//   SubmitButton,
// } from "popup/basics/Forms";

import {
  // clearApiError,
  importAccount,
  authErrorSelector,
} from "popup/ducks/accountServices";

import { Button, Checkbox, Input, InfoBlock } from "@stellar/design-system";

// import { WarningMessage } from "popup/components/WarningMessages";

import "./styles.scss";

export const ImportAccount = () => {
  interface FormValues {
    // password: string;
    privateKey: string;
  }

  const initialValues: FormValues = {
    // password: "",
    privateKey: "",
  };

  const ImportAccountSchema = YupObject().shape({
    privateKey: YupString().required(),
    // password: YupString().required(),
    authorization: YupBool().required(),
  });

  const dispatch: AppDispatch = useDispatch();
  const authError = useSelector(authErrorSelector);

  const handleSubmit = async (values: FormValues) => {
    // const { password, privateKey } = values;
    const { privateKey } = values;

    // ALEC TODO - remove
    const password = "";

    const res = await dispatch(importAccount({ password, privateKey }));

    if (importAccount.fulfilled.match(res)) {
      emitMetric(METRIC_NAMES.accountScreenImportAccount, {
        number_of_accounts: res.payload.allAccounts.length,
      });
      navigateTo(ROUTES.account);
    }
  };

  // const clearImportAccountError = (e: React.ChangeEvent<any>) => {
  //   if (authError && e.target.value === "") {
  //     dispatch(clearApiError());
  //   }
  // };

  return (
    <PopupWrapper>
      <div className="ImportAccount">
        <InfoBlock variant={InfoBlock.variant.warning}>
          <div className="ImportAccount__warning-header">
            read before importing your key
          </div>
          <div className="ImportAccount__warning-copy">
            <p>
              Freighter can't recover your imported secret key using your backup
              phrase. Storing your secret key is your responsability.{" "}
            </p>
            <p>
              Freighter will never ask for your secret key outside of the
              extension.
            </p>
          </div>
        </InfoBlock>
        <Formik
          initialValues={initialValues}
          onSubmit={handleSubmit}
          validationSchema={ImportAccountSchema}
        >
          {({ dirty, isSubmitting, isValid }) => (
            <Form>
              <div>
                <Field name="privateKey">
                  {({ field }: FieldProps) => (
                    <Input
                      autoComplete="off"
                      id="privateKey-input"
                      type="password"
                      placeholder="Your Stellar secret key"
                      error={authError}
                      {...field}
                    />
                  )}
                </Field>
              </div>
              <div>
                <Field name="authorization">
                  {({ field }: FieldProps) => (
                    <Checkbox
                      autoComplete="off"
                      id="authorization-input"
                      label="I’m aware Freighter can’t recover the imported  secret key"
                      // TODO - checkbox error
                      {...field}
                    />
                  )}
                </Field>
              </div>
              <div>
                <Button variant={Button.variant.tertiary}>Cancel</Button>
                <Button
                  type="submit"
                  isLoading={isSubmitting}
                  disabled={!(dirty && isValid)}
                >
                  Import
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </PopupWrapper>
  );
};
