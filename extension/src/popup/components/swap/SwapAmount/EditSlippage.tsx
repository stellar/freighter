import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Form, Field, FieldProps, Formik } from "formik";
import { object as YupObject, number as YupNumber } from "yup";
import { Button, Card, Input } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import {
  saveAllowedSlippage,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";

const defaultSlippage = "2";

interface EditSlippageProps {
  onClose: () => void;
}

export const EditSlippage = ({ onClose }: EditSlippageProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { allowedSlippage } = useSelector(transactionDataSelector);

  let presetSlippage = "";
  let customSlippage = "";
  if (["1", "2", "3"].includes(allowedSlippage)) {
    presetSlippage = allowedSlippage;
  } else {
    customSlippage = allowedSlippage;
  }

  return (
    <Formik
      initialValues={{ presetSlippage, customSlippage }}
      onSubmit={(values) => {
        dispatch(
          saveAllowedSlippage(values.customSlippage || values.presetSlippage),
        );
        onClose();
      }}
      validationSchema={YupObject().shape({
        customSlippage: YupNumber()
          .min(0, `${t("must be at least")} 0%`)
          .max(10, `${t("must be below")} 10%`),
      })}
    >
      {({ setFieldValue, values, errors }) => (
        <Form
          className="View__contentAndFooterWrapper"
          data-testid="slippage-form"
        >
          <View.Content hasNoTopPadding>
            <div className="Slippage">
              <Card>
                <p>{t("Allowed Slippage")}</p>
                <div className="Slippage__cards">
                  {["1", "2", "3"].map((value) => (
                    <label key={value} className="Slippage--radio-label">
                      <Field
                        className="Slippage--radio-field"
                        name="presetSlippage"
                        type="radio"
                        value={value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setFieldValue("presetSlippage", e.target.value);
                          setFieldValue("customSlippage", "");
                          dispatch(saveAllowedSlippage(e.target.value));
                          onClose();
                        }}
                      />
                      <Card>{value}%</Card>
                    </label>
                  ))}
                </div>
                <div className="Slippage__custom-input">
                  <Field name="customSlippage">
                    {({ field }: FieldProps) => (
                      <Input
                        data-testid="custom-slippage-input"
                        fieldSize="md"
                        id="custom-input"
                        min={0}
                        max={10}
                        placeholder={`${t("Custom")} %`}
                        type="number"
                        {...field}
                        onChange={(e) => {
                          setFieldValue("customSlippage", e.target.value);
                          setFieldValue("presetSlippage", "");
                        }}
                        error={errors.customSlippage}
                      />
                    )}
                  </Field>
                </div>
                <div className="Slippage__Footer">
                  <Button
                    size="md"
                    isFullWidth
                    isRounded
                    variant="tertiary"
                    type="button"
                    onClick={() => {
                      setFieldValue("presetSlippage", defaultSlippage);
                      setFieldValue("customSlippage", "");
                    }}
                  >
                    {t("Set default")}
                  </Button>
                  <Button
                    size="md"
                    isFullWidth
                    isRounded
                    disabled={!values.presetSlippage && !values.customSlippage}
                    variant="secondary"
                    type="submit"
                  >
                    {t("Done")}
                  </Button>
                </div>
              </Card>
            </div>
          </View.Content>
        </Form>
      )}
    </Formik>
  );
};
