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
import { BottomNav } from "popup/components/BottomNav";
import { importAccount, authErrorSelector } from "popup/ducks/accountServices";
import { FormRows } from "popup/basics/Forms";

import { Button, Checkbox, Input, InfoBlock } from "@stellar/design-system";

import "./styles.scss";

export const ImportAccount = () => {
  interface FormValues {
    password: string;
    privateKey: string;
    authorization: boolean;
  }

  const initialValues: FormValues = {
    password: "",
    privateKey: "",
    authorization: false,
  };

  const ImportAccountSchema = YupObject().shape({
    privateKey: YupString().required(),
    password: YupString().required(),
    authorization: YupBool().oneOf([true], "required"),
  });

  const dispatch: AppDispatch = useDispatch();
  const authError = useSelector(authErrorSelector);

  const handleSubmit = async (values: FormValues) => {
    const { password, privateKey } = values;

    const res = await dispatch(importAccount({ password, privateKey }));

    if (importAccount.fulfilled.match(res)) {
      emitMetric(METRIC_NAMES.accountScreenImportAccount, {
        number_of_accounts: res.payload.allAccounts.length,
      });
      navigateTo(ROUTES.account);
    }
  };

  return (
    <>
      <PopupWrapper>
        <div className="ImportAccount">
          <div className="ImportAccount__warning-block">
            <InfoBlock variant={InfoBlock.variant.warning}>
              <div className="ImportAccount__warning-header">
                read before importing your key
              </div>
              <div className="ImportAccount__warning-copy">
                <p>
                  Freighter can't recover your imported secret key using your
                  backup phrase. Storing your secret key is your responsability.{" "}
                </p>
                <p>
                  Freighter will never ask for your secret key outside of the
                  extension.
                </p>
              </div>
            </InfoBlock>
          </div>
          <Formik
            initialValues={initialValues}
            onSubmit={handleSubmit}
            validationSchema={ImportAccountSchema}
          >
            {({ dirty, isSubmitting, isValid }) => (
              <Form>
                <FormRows>
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
                  <Field name="password">
                    {({ field }: FieldProps) => (
                      <Input
                        autoComplete="off"
                        id="password-input"
                        type="password"
                        placeholder="Enter password"
                        error={authError}
                        {...field}
                      />
                    )}
                  </Field>
                  <Field name="authorization">
                    {({ field }: FieldProps) => (
                      <Checkbox
                        autoComplete="off"
                        id="authorization-input"
                        label="I’m aware Freighter can’t recover the imported  secret key"
                        {...field}
                      />
                    )}
                  </Field>
                </FormRows>
                <div className="ImportAccount__btn-row">
                  <Button
                    variant={Button.variant.tertiary}
                    onClick={() => navigateTo(ROUTES.account)}
                  >
                    Cancel
                  </Button>
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
      <BottomNav />
    </>
  );
};
