import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Form, Formik, FieldProps } from "formik";

import {
  Button,
  Input,
  Icon,
  TextLink,
  Card,
  DetailsTooltip,
} from "@stellar/design-system";

import {
  transactionDataSelector,
  saveAllowedSlippage,
} from "popup/ducks/transactionSubmission";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";

import "./styles.scss";

export const SendSettingsSlippage = () => {
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
    <PopupWrapper>
      <div className="Slippage__top-btns">
        <div
          className="Slippage__top-btns__exit"
          onClick={() => navigateTo(ROUTES.sendPaymentSettings)}
        >
          <Icon.X />
        </div>
        <DetailsTooltip
          // TODO - add copy
          details=""
        >
          <span></span>
        </DetailsTooltip>
      </div>
      <div className="Slippage">
        <div className="SendPayment__header">Allowed Slippage</div>
        <Formik
          initialValues={{ presetSlippage, customSlippage }}
          onSubmit={(values) => {
            dispatch(
              saveAllowedSlippage(
                values.customSlippage || values.presetSlippage,
              ),
            );
            navigateTo(ROUTES.sendPaymentSettings);
          }}
        >
          {({ setFieldValue, values }) => (
            <Form>
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
                      id="custom-input"
                      placeholder="Custom %"
                      type="number"
                      {...field}
                      // ALEC TODO - add validation for max slippage allowed (15%?)
                      onChange={(e) => {
                        setFieldValue("customSlippage", e.target.value);
                        setFieldValue("presetSlippage", "");
                      }}
                    />
                  )}
                </Field>
              </div>
              <TextLink
                underline
                variant={TextLink.variant.secondary}
                onClick={() => {
                  // ALEC TODO - should default to 1?
                  setFieldValue("presetSlippage", "1");
                  setFieldValue("customSlippage", "");
                }}
              >
                Set default
              </TextLink>
              <div className="SendPayment__btn-continue">
                <Button
                  fullWidth
                  disabled={!values.presetSlippage && !values.customSlippage}
                  variant={Button.variant.tertiary}
                  type="submit"
                >
                  Done
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </PopupWrapper>
  );
};
