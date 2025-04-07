import React from "react";
import { Field, Form, Formik, FieldProps } from "formik";
import { object as YupObject, number as YupNumber } from "yup";
import { useTranslation } from "react-i18next";
import { Input, Icon, Link, Card, Button } from "@stellar/design-system";

import { InfoTooltip } from "popup/basics/InfoTooltip";
import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

const defaultSlippage = "1";

interface SendSettingsSlippageProps {
  allowedSlippage: string;
  setSlippage: (slippage: string) => void;
  goBack: () => void;
}

export const SendSettingsSlippage = ({
  goBack,
  allowedSlippage,
  setSlippage,
}: SendSettingsSlippageProps) => {
  const { t } = useTranslation();

  let presetSlippage = "";
  let customSlippage = "";
  if (["1", "2", "3"].includes(allowedSlippage)) {
    presetSlippage = allowedSlippage;
  } else {
    customSlippage = allowedSlippage;
  }

  return (
    <React.Fragment>
      <SubviewHeader
        title="Allowed Slippage"
        customBackAction={goBack}
        customBackIcon={<Icon.XClose />}
        rightButton={
          <InfoTooltip
            // TODO - add link to FAQ when added
            infoText={
              <span>
                {t("Allowed downward variation in the destination amount")}
              </span>
            }
            placement="bottom"
          >
            <></>
          </InfoTooltip>
        }
      />
      <Formik
        initialValues={{ presetSlippage, customSlippage }}
        onSubmit={(values) => {
          setSlippage(values.customSlippage || values.presetSlippage);
          goBack();
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
              <div className="Slippage__cards">
                <label className="Slippage--radio-label">
                  <Field
                    className="Slippage--radio-field"
                    name="presetSlippage"
                    type="radio"
                    value="1"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setFieldValue("presetSlippage", e.target.value);
                      setFieldValue("customSlippage", "");
                    }}
                  />
                  <Card>1%</Card>
                </label>
                <label className="Slippage--radio-label">
                  <Field
                    className="Slippage--radio-field"
                    name="presetSlippage"
                    type="radio"
                    value="2"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setFieldValue("presetSlippage", e.target.value);
                      setFieldValue("customSlippage", "");
                    }}
                  />
                  <Card>2%</Card>
                </label>
                <label className="Slippage--radio-label">
                  <Field
                    className="Slippage--radio-field"
                    name="presetSlippage"
                    type="radio"
                    value="3"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setFieldValue("presetSlippage", e.target.value);
                      setFieldValue("customSlippage", "");
                    }}
                  />
                  <Card>3%</Card>
                </label>
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
              {}
              <Link
                isUnderline
                variant="secondary"
                role="button"
                onClick={() => {
                  setFieldValue("presetSlippage", defaultSlippage);
                  setFieldValue("customSlippage", "");
                }}
              >
                {t("Set default")}
              </Link>
            </View.Content>
            <View.Footer>
              <Button
                size="md"
                isFullWidth
                disabled={!values.presetSlippage && !values.customSlippage}
                variant="secondary"
                type="submit"
              >
                {t("Done")}
              </Button>
            </View.Footer>
          </Form>
        )}
      </Formik>
    </React.Fragment>
  );
};
