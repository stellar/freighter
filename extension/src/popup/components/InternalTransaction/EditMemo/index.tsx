import React from "react";
import { Button, Card, Input } from "@stellar/design-system";
import { Field, FieldProps, Form, Formik } from "formik";
import { useTranslation } from "react-i18next";

import { View } from "popup/basics/layout/View";

import "./styles.scss";

interface FormValue {
  memo: string;
}

interface EditMemoProps {
  memo: string;
  onClose: () => void;
  onSubmit: (args: FormValue) => void;
}

export const EditMemo = ({ memo, onClose, onSubmit }: EditMemoProps) => {
  const { t } = useTranslation();
  const initialValues: FormValue = {
    memo,
  };
  const handleSubmit = async (values: FormValue) => {
    onSubmit(values);
  };

  return (
    <View.Content hasNoTopPadding>
      <div className="EditMemo">
        <Card>
          <p>Memo</p>
          <Formik initialValues={initialValues} onSubmit={handleSubmit}>
            {({ errors }) => (
              <>
                <Form className="EditMemo__form">
                  <Field name="memo">
                    {({ field }: FieldProps) => (
                      <Input
                        data-testid="edit-memo-input"
                        autoFocus
                        fieldSize="md"
                        autoComplete="off"
                        id="memo"
                        placeholder={"Memo"}
                        {...field}
                        error={errors.memo}
                      />
                    )}
                  </Field>
                  <div className="EditMemo__description">
                    {t("What is this transaction for? (optional)")}
                  </div>
                  <div className="EditMemo__actions">
                    <Button
                      type="button"
                      size="md"
                      isRounded
                      variant="tertiary"
                      onClick={onClose}
                    >
                      {t("Cancel")}
                    </Button>
                    <Button
                      type="submit"
                      size="md"
                      isRounded
                      variant="secondary"
                    >
                      {t("Save")}
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </Formik>
        </Card>
      </div>
    </View.Content>
  );
};
