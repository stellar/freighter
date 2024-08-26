import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Form, Formik, FieldProps } from "formik";
import { object as YupObject, number as YupNumber } from "yup";
import { useTranslation } from "react-i18next";
import { Input, Icon, Link, Card, Button } from "@stellar/design-system";

import {
  transactionDataSelector,
  saveAllowedSlippage,
} from "popup/ducks/transactionSubmission";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { InfoTooltip } from "popup/basics/InfoTooltip";
import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

const defaultSlippage = "1";

export const SendSettingsSlippage = ({ previous }: { previous: ROUTES }) => {
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
    <React.Fragment>
      <SubviewHeader
        title="Allowed Slippage"
        customBackAction={() => navigateTo(previous)}
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
          dispatch(
            saveAllowedSlippage(values.customSlippage || values.presetSlippage),
          );
          navigateTo(previous);
        }}
        validationSchema={YupObject().shape({
          customSlippage: YupNumber().max(10, `${t("must be below")} 10%`),
        })}
      >
        {({ setFieldValue, values, errors }) => (
          <Form className="View__contentAndFooterWrapper">
            <View.Content>
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
                      fieldSize="md"
                      id="custom-input"
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
              {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
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
