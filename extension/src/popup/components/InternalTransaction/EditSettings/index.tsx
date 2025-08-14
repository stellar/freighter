import React from "react";
import { Button, Card, Input } from "@stellar/design-system";
import { Field, FieldProps, Formik, Form } from "formik";
import { useTranslation } from "react-i18next";

import { View } from "popup/basics/layout/View";
import { CongestionIndicator } from "../CongestionIndicator";

import "./styles.scss";

export interface EditSettingsFormValue {
  fee: string;
  timeout: number;
}

interface EditSettingsProps {
  fee: string;
  timeout: number;
  congestion: string;
  title: string;
  onClose: () => void;
  onSubmit: (args: EditSettingsFormValue) => void;
}

export const EditSettings = ({
  fee,
  timeout,
  congestion,
  title,
  onClose,
  onSubmit,
}: EditSettingsProps) => {
  const { t } = useTranslation();
  const initialValues: EditSettingsFormValue = {
    fee,
    timeout,
  };
  const handleSubmit = async (values: EditSettingsFormValue) => {
    onSubmit(values);
  };

  return (
    <View.Content hasNoTopPadding>
      <div className="EditTxSettings">
        <Card>
          {title && <p>{title}</p>}
          <Formik initialValues={initialValues} onSubmit={handleSubmit}>
            {({ errors, setFieldValue }) => (
              <>
                <Form className="EditTxSettings__form">
                  <Field name="fee">
                    {({ field }: FieldProps) => (
                      <Input
                        type="text"
                        min={0}
                        autoFocus
                        fieldSize="md"
                        autoComplete="off"
                        id="fee"
                        placeholder={"Fee"}
                        label="Transaction Fee"
                        {...field}
                        error={errors.fee}
                        onChange={(e) => {
                          let value = e.target.value;
                          if (value === "") {
                            setFieldValue("fee", "");
                            return;
                          }

                          // Only allow digits and one decimal point
                          if (!/^\d*\.?\d*$/.test(value)) return;

                          const [intPart, decPart] = value.split(".");
                          if (decPart && decPart.length > 7) {
                            value = `${intPart}.${decPart.slice(0, 7)}`;
                          }

                          setFieldValue("fee", value);
                        }}
                        rightElement={
                          <Button
                            type="button"
                            size="md"
                            variant="tertiary"
                            onClick={() => setFieldValue("fee", fee)}
                          >
                            {t("Default")}
                          </Button>
                        }
                      />
                    )}
                  </Field>
                  <div className="EditTxSettings__congestion">
                    <CongestionIndicator congestion={congestion} />
                    {congestion} congestion
                  </div>
                  <Field name="timeout">
                    {({ field }: FieldProps) => (
                      <Input
                        type="text"
                        fieldSize="md"
                        autoComplete="off"
                        id="timeout"
                        placeholder={"Timeout"}
                        label="Timeout (seconds)"
                        {...field}
                        error={errors.timeout}
                        onChange={(e) => {
                          let value = e.target.value;

                          // Only digits, no decimals
                          if (!/^\d*$/.test(value)) return;
                          setFieldValue(
                            "timeout",
                            value === "" ? "" : parseInt(value, 10),
                          );
                        }}
                        rightElement={
                          <Button
                            type="button"
                            size="md"
                            variant="tertiary"
                            onClick={() => setFieldValue("timeout", timeout)}
                          >
                            {t("Default")}
                          </Button>
                        }
                      />
                    )}
                  </Field>
                  <div className="EditTxSettings__actions">
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
