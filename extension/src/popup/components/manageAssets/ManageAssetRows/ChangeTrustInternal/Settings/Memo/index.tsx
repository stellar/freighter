import React from "react";
import { Field, FieldProps, Formik, Form } from "formik";
import { Button, Input } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

interface MemoProps {
  memo: string;
  onSave: (fee: string) => void;
  goBack: () => void;
}

export const Memo = ({ memo, onSave, goBack }: MemoProps) => {
  const { t } = useTranslation();
  const initialValues = {
    memo,
  };
  const handleSubmit = async (values: { memo: string }) => {
    onSave(values.memo);
    goBack();
  };
  return (
    <>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        id="memo-form"
      >
        {({ errors, setFieldValue, submitForm }) => (
          <>
            <SubviewHeader
              title={<span>{t("Memo")}</span>}
              hasBackButton
              customBackAction={goBack}
            />
            <View.Content>
              <div className="TxMemo">
                <Form className="TxMemo__form">
                  <Field name="memo">
                    {({ field }: FieldProps) => (
                      <Input
                        {...field}
                        autoFocus
                        fieldSize="md"
                        autoComplete="off"
                        id="memo"
                        error={errors.memo}
                        onChange={(e) => {
                          e.stopPropagation();
                          const target = e.target as HTMLInputElement;
                          setFieldValue("memo", target.value);
                        }}
                      />
                    )}
                  </Field>
                </Form>
              </div>
            </View.Content>
            <View.Footer>
              <div className="TxMemo__actions">
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
