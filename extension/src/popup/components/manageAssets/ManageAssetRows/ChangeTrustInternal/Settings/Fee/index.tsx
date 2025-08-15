import React from "react";
import { Field, FieldProps, Formik, Form } from "formik";
import { Button, Input } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

interface FeeProps {
  fee: string;
  recommendedFee: string;
  onSaveFee: (fee: string) => void;
  goBack: () => void;
}

export const Fee = ({ fee, recommendedFee, onSaveFee, goBack }: FeeProps) => {
  const { t } = useTranslation();
  const initialValues = {
    fee,
  };
  const handleSubmit = async (values: { fee: string }) => {
    onSaveFee(values.fee);
    goBack();
  };
  return (
    <>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        id="fee-form"
      >
        {({ errors, setFieldValue, submitForm }) => (
          <>
            <SubviewHeader
              title={<span>Transaction Fee</span>}
              hasBackButton
              customBackAction={goBack}
            />
            <View.Content>
              <div className="TxFee">
                <Form className="TxFee__form">
                  <Field name="fee">
                    {({ field }: FieldProps) => (
                      <Input
                        {...field}
                        autoFocus
                        fieldSize="md"
                        autoComplete="off"
                        id="fee"
                        error={errors.fee}
                        rightElement={<span>XLM</span>}
                        onChange={(e) => {
                          e.stopPropagation();
                          const target = e.target as HTMLInputElement;
                          setFieldValue("fee", target.value);
                        }}
                      />
                    )}
                  </Field>
                </Form>
              </div>
            </View.Content>
            <View.Footer>
              <div className="TxFee__actions">
                <Button
                  type="button"
                  size="lg"
                  isRounded
                  isFullWidth
                  variant="tertiary"
                  onClick={() => {
                    onSaveFee(recommendedFee);
                    goBack();
                  }}
                >
                  {t("Set recommended")}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  isRounded
                  isFullWidth
                  variant="secondary"
                  onClick={submitForm}
                >
                  {t("Save")}
                </Button>
              </div>
            </View.Footer>
          </>
        )}
      </Formik>
    </>
  );
};
