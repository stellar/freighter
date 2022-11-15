import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Form, Field, FieldProps, Formik } from "formik";
import { bool as YupBool, object as YupObject, string as YupString } from "yup";
import { Checkbox, Input } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";
import { InfoBlock } from "popup/basics/InfoBlock";
import { FormRows } from "popup/basics/Forms";
import { Button } from "popup/basics/buttons/Button";
import { importAccount, authErrorSelector } from "popup/ducks/accountServices";

import { SubviewHeader } from "popup/components/SubviewHeader";

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

  const { t } = useTranslation();
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
    } else {
      emitMetric(METRIC_NAMES.accountScreenImportAccountFail, {
        error_type: res.payload?.errorMessage || "",
      });
    }
  };

  return (
    <div className="ImportAccount">
      <SubviewHeader title={t("Import Stellar Secret Key")} />
      <div className="ImportAccount__warning-block">
        <InfoBlock variant={InfoBlock.variant.warning}>
          <div>
            <div className="ImportAccount__warning-header">
              {t("read before importing your key")}
            </div>
            <div className="ImportAccount__warning-copy">
              <p>
                {t(
                  "Freighter can’t recover your imported secret key using your recovery phrase. Storing your secret key is your responsibility. Freighter will never ask for your secret key outside of the extension.",
                )}
              </p>
            </div>
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
                    placeholder={t("Your Stellar secret key")}
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
                    placeholder={t("Enter password")}
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
                    label={t(
                      "I’m aware Freighter can’t recover the imported  secret key",
                    )}
                    {...field}
                  />
                )}
              </Field>
            </FormRows>
            <div className="ImportAccount__btn-row">
              <Button
                fullWidth
                variant={Button.variant.tertiary}
                onClick={() => navigateTo(ROUTES.account)}
              >
                {t("Cancel")}
              </Button>
              <Button
                fullWidth
                type="submit"
                isLoading={isSubmitting}
                disabled={!(dirty && isValid)}
              >
                {t("Import")}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};
