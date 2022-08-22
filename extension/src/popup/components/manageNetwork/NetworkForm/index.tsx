import React from "react";
import { useDispatch } from "react-redux";
import { Checkbox, Input } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Field, FieldProps, Form, Formik } from "formik";

import { AppDispatch } from "popup/App";

import { Button } from "popup/basics/buttons/Button";
import { ROUTES } from "popup/constants/routes";

import { navigateTo } from "popup/helpers/navigate";

import { addCustomNetwork, changeNetwork } from "popup/ducks/settings";

import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

const CUSTOM_NETWORK = "CUSTOM";

interface FormValues {
  networkName: string;
  networkPassphrase: string;
  networkUrl: string;
  isSwitchSelected: boolean;
}

interface NetworkFormProps {
  isEditing: boolean;
}

export const NetworkForm = ({ isEditing }: NetworkFormProps) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();

  const initialValues: FormValues = {
    networkName: "",
    networkPassphrase: "",
    networkUrl: "",
    isSwitchSelected: false,
  };

  const handleSubmit = async (values: FormValues) => {
    if (isEditing) {
      const res = await dispatch(changeNetwork(values));
      if (changeNetwork.fulfilled.match(res)) {
        navigateTo(ROUTES.account);
      }
    } else {
      const res = await dispatch(
        addCustomNetwork({
          customNetwork: {
            network: CUSTOM_NETWORK,
            ...values,
          },
        }),
      );
      if (addCustomNetwork.fulfilled.match(res)) {
        navigateTo(ROUTES.account);
      }
    }
  };

  return (
    <div className="NetworkForm">
      <SubviewHeader
        title={isEditing ? t("Add Custom Network") : t("Network Details")}
      />
      <Formik onSubmit={handleSubmit} initialValues={initialValues}>
        {({ dirty, errors, isSubmitting, isValid, touched }) => (
          <Form className="DisplayBackupPhrase__form">
            <Input
              id="networkName"
              autoComplete="off"
              error={
                errors.networkName && touched.networkName
                  ? errors.networkName
                  : ""
              }
              customInput={<Field />}
              label={t("Name")}
              name="networkName"
              placeholder={t("Enter network name")}
            />
            <Input
              id="networkUrl"
              autoComplete="off"
              error={
                errors.networkUrl && touched.networkUrl ? errors.networkUrl : ""
              }
              customInput={<Field />}
              label={t("URL")}
              name="networkUrl"
              placeholder={t("Enter network URL")}
            />
            <Input
              id="networkPassphrase"
              autoComplete="off"
              error={
                errors.networkPassphrase && touched.networkPassphrase
                  ? errors.networkPassphrase
                  : ""
              }
              customInput={<Field />}
              label={t("Passphrase")}
              name="networkPassphrase"
              placeholder={t("Enter passphrase")}
            />
            {isEditing ? (
              "Remove"
            ) : (
              <Field name="isSwitchSelected">
                {({ field }: FieldProps) => (
                  <Checkbox
                    autoComplete="off"
                    id="isSwitchSelected-input"
                    error={
                      errors.isSwitchSelected && touched.isSwitchSelected
                        ? errors.isSwitchSelected
                        : null
                    }
                    label={<span>{t("Switch to this network")}</span>}
                    {...field}
                  />
                )}
              </Field>
            )}
            {isEditing ? (
              <Button
                disabled={!(isValid && dirty)}
                fullWidth
                isLoading={isSubmitting}
                type="submit"
                variant={Button.variant.tertiary}
              >
                {t("Add network")}
              </Button>
            ) : (
              <Button
                disabled={!(isValid && dirty)}
                fullWidth
                isLoading={isSubmitting}
                type="submit"
                variant={Button.variant.tertiary}
              >
                {t("Save")}
              </Button>
            )}
          </Form>
        )}
      </Formik>
    </div>
  );
};
