import React from "react";
import { Field, FieldProps, Formik, Form } from "formik";
import { Button, Input } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

interface TimeoutProps {
  timeout: string;
  onSave: (fee: string) => void;
  goBack: () => void;
}

export const Timeout = ({ timeout, onSave, goBack }: TimeoutProps) => {
  const { t } = useTranslation();
  const initialValues = {
    timeout,
  };
  const handleSubmit = async (values: { timeout: string }) => {
    onSave(values.timeout);
    goBack();
  };
  return (
    <>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        id="timeout-form"
      >
        {({ errors, setFieldValue, submitForm }) => (
          <>
            <SubviewHeader
              title={<span>Transaction Timeout</span>}
              hasBackButton
              customBackAction={goBack}
            />
            <View.Content>
              <div className="TxTimeout">
                <Form className="TxTimeout__form">
                  <Field name="timeout">
                    {({ field }: FieldProps) => (
                      <Input
                        {...field}
                        autoFocus
                        fieldSize="md"
                        autoComplete="off"
                        id="timeout"
                        error={errors.timeout}
                        rightElement={<span>seconds</span>}
                        onChange={(e) => {
                          e.stopPropagation();
                          const target = e.target as HTMLInputElement;
                          setFieldValue("timeout", target.value);
                        }}
                      />
                    )}
                  </Field>
                </Form>
              </div>
            </View.Content>
            <View.Footer>
              <div className="TxTimeout__actions">
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
