import React from "react";
import { Button, Card, Input } from "@stellar/design-system";
import { Field, FieldProps, Form, Formik } from "formik";
import { useTranslation } from "react-i18next";

import { View } from "popup/basics/layout/View";
import { useValidateMemo } from "popup/helpers/useValidateMemo";

import "./styles.scss";

interface FormValue {
  memo: string;
}

interface EditMemoProps {
  memo: string;
  onClose: () => void;
  onSubmit: (args: FormValue) => void;
  disabled?: boolean;
  disabledMessage?: string;
}

export const EditMemo = ({
  memo,
  onClose,
  onSubmit,
  disabled = false,
  disabledMessage,
}: EditMemoProps) => {
  const { t } = useTranslation();
  const [localMemo, setLocalMemo] = React.useState(memo);
  const { error: memoError } = useValidateMemo(localMemo);

  const initialValues: FormValue = {
    memo,
  };
  const handleSubmit = async (values: FormValue) => {
    if (!disabled) {
      onSubmit(values);
    }
  };

  const handleFieldChange = (value: string) => {
    setLocalMemo(value);
  };

  const renderField = ({ field }: FieldProps) => (
    <Input
      data-testid="edit-memo-input"
      autoFocus
      fieldSize="md"
      autoComplete="off"
      id="memo"
      placeholder={t("Type your memo")}
      {...field}
      onChange={(e) => {
        field.onChange(e);
        handleFieldChange(e.target.value);
      }}
      error={memoError}
    />
  );

  const renderForm = () => (
    <Form className="EditMemo__form">
      <Field name="memo">{renderField}</Field>
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
          disabled={!!memoError}
        >
          {t("Save")}
        </Button>
      </div>
    </Form>
  );

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
                        autoFocus={!disabled}
                        fieldSize="md"
                        autoComplete="off"
                        id="memo"
                        placeholder={"Memo"}
                        {...field}
                        error={errors.memo}
                        disabled={disabled}
                      />
                    )}
                  </Field>
                  {disabled && disabledMessage && (
                    <div className="EditMemo__description EditMemo__description--warning">
                      {disabledMessage}
                    </div>
                  )}
                  {!disabled && (
                    <div className="EditMemo__description">
                      What is this transaction for? (optional)
                    </div>
                  )}
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
                      disabled={disabled}
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
