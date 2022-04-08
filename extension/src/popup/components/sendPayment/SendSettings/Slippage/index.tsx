import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Form, Formik, FieldProps } from "formik";
import { object as YupObject, number as YupNumber } from "yup";

import {
  Input,
  Icon,
  TextLink,
  Card,
  DetailsTooltip,
} from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import {
  transactionDataSelector,
  saveAllowedSlippage,
} from "popup/ducks/transactionSubmission";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { SubviewHeader } from "popup/components/SubviewHeader";

import "./styles.scss";

const defaultSlippage = "1";

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
      <SubviewHeader
        title="Allowed Slippage"
        customBackAction={() => navigateTo(ROUTES.sendPaymentSettings)}
        customBackIcon={<Icon.X />}
        rightButton={
          <DetailsTooltip
            // TODO - add link to FAQ when added
            details={
              <span>Allowed downward variation in the destination amount</span>
            }
            tooltipPosition={DetailsTooltip.tooltipPosition.BOTTOM}
          >
            <span></span>
          </DetailsTooltip>
        }
      />
      <div className="Slippage">
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
          validationSchema={YupObject().shape({
            customSlippage: YupNumber().max(10, "must be below 10%"),
          })}
        >
          {({ setFieldValue, values, errors }) => (
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
                      onChange={(e) => {
                        setFieldValue("customSlippage", e.target.value);
                        setFieldValue("presetSlippage", "");
                      }}
                      error={errors.customSlippage}
                    />
                  )}
                </Field>
              </div>
              <TextLink
                underline
                variant={TextLink.variant.secondary}
                onClick={() => {
                  setFieldValue("presetSlippage", defaultSlippage);
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
