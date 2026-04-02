import React, { useRef } from "react";
import { Button, Card, Icon, Input } from "@stellar/design-system";
import { Field, FieldProps, Formik, Form } from "formik";
import { useTranslation } from "react-i18next";

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
  isSoroban?: boolean;
  onClose: () => void;
  onFeeChange?: (fee: string) => void;
  onShowFeesInfo?: (currentDraftFee: string) => void;
  onSubmit: (args: EditSettingsFormValue) => void;
}

export const EditSettings = ({
  fee,
  timeout,
  congestion,
  title,
  isSoroban = false,
  onClose,
  onFeeChange,
  onShowFeesInfo,
  onSubmit,
}: EditSettingsProps) => {
  const { t } = useTranslation();
  // Tracks the current draft fee so onShowFeesInfo can pass it to the parent
  // for an accurate FeesPane total without requiring a Redux save first.
  const draftFeeRef = useRef<string>(fee);
  const initialValues: EditSettingsFormValue = {
    fee,
    timeout,
  };
  const handleSubmit = async (values: EditSettingsFormValue) => {
    onSubmit(values);
  };

  const feeLabel = (
    <span className="EditTxSettings__fee-label">
      {isSoroban ? t("Inclusion Fee") : t("Transaction Fee")}
      {isSoroban && onShowFeesInfo && (
        <button
          className="EditTxSettings__fee-info-btn"
          type="button"
          onClick={() => onShowFeesInfo?.(draftFeeRef.current)}
          aria-label={t("Fee breakdown")}
          data-testid="edit-settings-fees-info-btn"
        >
          <Icon.InfoCircle />
        </button>
      )}
    </span>
  );

  return (
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
                      data-testid="edit-tx-settings-fee-input"
                      type="text"
                      min={0}
                      autoFocus
                      fieldSize="md"
                      autoComplete="off"
                      id="fee"
                      placeholder={t("Fee")}
                      label={feeLabel}
                      {...field}
                      error={errors.fee}
                      onChange={(e) => {
                        let value = e.target.value;
                        if (value === "") {
                          setFieldValue("fee", "");
                          draftFeeRef.current = "";
                          onFeeChange?.("");
                          return;
                        }

                        // Only allow digits and one decimal point
                        if (!/^\d*\.?\d*$/.test(value)) return;

                        const [intPart, decPart] = value.split(".");
                        if (decPart && decPart.length > 7) {
                          value = `${intPart}.${decPart.slice(0, 7)}`;
                        }

                        setFieldValue("fee", value);
                        draftFeeRef.current = value;
                        onFeeChange?.(value);
                      }}
                      rightElement={
                        <Button
                          type="button"
                          size="md"
                          variant="tertiary"
                          onClick={() => {
                            setFieldValue("fee", fee);
                            draftFeeRef.current = fee;
                            onFeeChange?.(fee);
                          }}
                        >
                          {t("Default")}
                        </Button>
                      }
                    />
                  )}
                </Field>
                <div className="EditTxSettings__congestion">
                  <CongestionIndicator congestion={congestion} />
                  {congestion} {t("congestion")}
                </div>
                <Field name="timeout">
                  {({ field }: FieldProps) => (
                    <Input
                      type="text"
                      fieldSize="md"
                      autoComplete="off"
                      id="timeout"
                      placeholder={t("Timeout")}
                      label={t("Timeout (seconds)")}
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
                    size="lg"
                    isRounded
                    variant="tertiary"
                    onClick={onClose}
                  >
                    {t("Cancel")}
                  </Button>
                  <Button type="submit" size="lg" isRounded variant="secondary">
                    {t("Save")}
                  </Button>
                </div>
              </Form>
            </>
          )}
        </Formik>
      </Card>
    </div>
  );
};
