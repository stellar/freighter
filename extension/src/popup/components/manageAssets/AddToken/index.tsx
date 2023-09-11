import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Input } from "@stellar/design-system";
import { Field, Form, Formik, FieldProps } from "formik";
import { useTranslation } from "react-i18next";

import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { emitMetric } from "helpers/metrics";

import { FormRows, SubmitButtonWrapper } from "popup/basics/Forms";
import { PopupWrapper } from "popup/basics/PopupWrapper";

import { SubviewHeader } from "popup/components/SubviewHeader";

import { addTokenId, authErrorSelector } from "popup/ducks/accountServices";

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

  const handleSubmit = async (values: FormValues) => {
    const { tokenId } = values;
    const res = await dispatch(addTokenId(tokenId));

    if (addTokenId.fulfilled.match(res)) {
      emitMetric(METRIC_NAMES.manageAssetAddToken);
      navigateTo(ROUTES.account);
    }
  };

  return (
    <>
      <PopupWrapper>
        <SubviewHeader title={t("Add a Soroban token by ID")} />
        <Formik initialValues={initialValues} onSubmit={handleSubmit}>
          {({ dirty, isSubmitting, isValid, errors, touched }) => (
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
                <SubmitButtonWrapper>
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
                </SubmitButtonWrapper>
              </FormRows>
            </Form>
          )}
        </Formik>
      </PopupWrapper>
    </>
  );
};
