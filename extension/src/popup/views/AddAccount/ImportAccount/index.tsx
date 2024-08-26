import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Form, Field, FieldProps, Formik } from "formik";
import { bool as YupBool, object as YupObject, string as YupString } from "yup";
import {
  Button,
  Checkbox,
  Icon,
  Input,
  Notification,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";
import { FormRows } from "popup/basics/Forms";
import { importAccount, authErrorSelector } from "popup/ducks/accountServices";

import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";
import { View } from "popup/basics/layout/View";

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

  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const authError = useSelector(authErrorSelector);

  const handleSubmit = async (values: FormValues) => {
    const { password, privateKey } = values;

    const res = await dispatch(importAccount({ password, privateKey }));

    if (importAccount.fulfilled.match(res)) {
      emitMetric(METRIC_NAMES.accountScreenImportAccount, {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        number_of_accounts: res.payload.allAccounts.length,
      });
      navigateTo(ROUTES.account);
    } else {
      emitMetric(METRIC_NAMES.accountScreenImportAccountFail, {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        error_type: res.payload?.errorMessage || "",
      });
    }
  };

  return (
    <React.Fragment>
      <SubviewHeader title={t("Import Stellar Secret Key")} />

      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        validationSchema={ImportAccountSchema}
      >
        {({ dirty, isSubmitting, isValid }) => (
          <Form className="View__contentAndFooterWrapper">
            <View.Content>
              <div className="ImportAccount__warning-block">
                <Notification
                  variant="warning"
                  icon={<Icon.InfoOctagon />}
                  title={t("Read before importing your key")}
                >
                  {t(
                    "Freighter can’t recover your imported secret key using your recovery phrase. Storing your secret key is your responsibility. Freighter will never ask for your secret key outside of the extension.",
                  )}
                </Notification>
              </div>

              <FormRows>
                <Field name="privateKey">
                  {({ field }: FieldProps) => (
                    <Input
                      fieldSize="md"
                      autoComplete="off"
                      id="privateKey-input"
                      type="password"
                      placeholder={t("Your Stellar secret key")}
                      error={authError}
                      {...field}
                    />
                  )}
                </Field>
                <Field name="password">
                  {({ field }: FieldProps) => (
                    <Input
                      fieldSize="md"
                      autoComplete="off"
                      id="password-input"
                      type="password"
                      placeholder={t("Enter password")}
                      error={authError}
                      {...field}
                    />
                  )}
                </Field>
                <Field name="authorization">
                  {({ field }: FieldProps) => (
                    <Checkbox
                      fieldSize="md"
                      autoComplete="off"
                      id="authorization-input"
                      label={t(
                        "I’m aware Freighter can’t recover the imported  secret key",
                      )}
                      {...field}
                    />
                  )}
                </Field>
              </FormRows>
            </View.Content>
            <View.Footer isInline>
              <Button
                size="md"
                isFullWidth
                variant="secondary"
                onClick={() => navigateTo(ROUTES.account)}
              >
                {t("Cancel")}
              </Button>
              <Button
                size="md"
                isFullWidth
                variant="primary"
                type="submit"
                isLoading={isSubmitting}
                disabled={!(dirty && isValid)}
              >
                {t("Import")}
              </Button>
            </View.Footer>
          </Form>
        )}
      </Formik>
    </React.Fragment>
  );
};
