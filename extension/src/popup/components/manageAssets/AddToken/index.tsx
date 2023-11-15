import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input } from "@stellar/design-system";
import { Field, Form, Formik, FieldProps } from "formik";
import { useTranslation } from "react-i18next";
import { Networks } from "stellar-sdk";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";

import { FormRows } from "popup/basics/Forms";
import { View } from "popup/basics/layout/View";

import { SubviewHeader } from "popup/components/SubviewHeader";

import { addTokenId, authErrorSelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

interface FormValues {
  tokenId: string;
}

const initialValues: FormValues = {
  tokenId: "",
};

export const AddToken = () => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const authError = useSelector(authErrorSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const handleSubmit = async (values: FormValues) => {
    const { tokenId } = values;
    const res = await dispatch(
      addTokenId({ tokenId, network: networkDetails.network as Networks }),
    );

    if (addTokenId.fulfilled.match(res)) {
      emitMetric(METRIC_NAMES.manageAssetAddToken);
      navigateTo(ROUTES.account);
    }
  };

  return (
    <Formik initialValues={initialValues} onSubmit={handleSubmit}>
      {({ dirty, isSubmitting, isValid, errors, touched }) => (
        <View>
          <SubviewHeader title={t("Add a Soroban token by ID")} />
          <View.Content>
            <Form>
              <FormRows>
                <Field name="tokenId">
                  {({ field }: FieldProps) => (
                    <Input
                      fieldSize="md"
                      autoComplete="off"
                      id="tokenId-input"
                      placeholder={t("Enter Token ID")}
                      error={
                        authError ||
                        (errors.tokenId && touched.tokenId
                          ? errors.tokenId
                          : "")
                      }
                      {...field}
                    />
                  )}
                </Field>
              </FormRows>
            </Form>
          </View.Content>
          <View.Footer>
            <Button
              size="md"
              variant="primary"
              isFullWidth
              disabled={!(dirty && isValid)}
              isLoading={isSubmitting}
              type="submit"
            >
              {t("Add New Token")}
            </Button>
          </View.Footer>
        </View>
      )}
    </Formik>
  );
};
