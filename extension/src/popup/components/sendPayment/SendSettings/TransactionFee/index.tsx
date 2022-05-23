import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik, Form, Field, FieldProps } from "formik";

import { Input, Icon, TextLink, DetailsTooltip } from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { FormRows } from "popup/basics/Forms";
import { SubviewHeader } from "popup/components/SubviewHeader";
import {
  saveTransactionFee,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";

import "./styles.scss";

export const SendSettingsFee = () => {
  const dispatch = useDispatch();
  const { transactionFee } = useSelector(transactionDataSelector);
  const { networkCongestion, recommendedFee } = useNetworkFees();

  return (
    <PopupWrapper>
      <SubviewHeader
        title="Transaction Fee"
        customBackAction={() => navigateTo(ROUTES.sendPaymentSettings)}
        customBackIcon={<Icon.X />}
        rightButton={
          <DetailsTooltip
            tooltipPosition={DetailsTooltip.tooltipPosition.BOTTOM}
            details={
              <span>
                Maximum network transaction fee to be paid{" "}
                <TextLink
                  variant={TextLink.variant.secondary}
                  href="https://developers.stellar.org/docs/glossary/fees/#base-fee"
                  rel="noreferrer"
                  target="_blank"
                >
                  Learn more
                </TextLink>
              </span>
            }
          >
            <span></span>
          </DetailsTooltip>
        }
      />
      <div className="TransactionFee">
        <Formik
          initialValues={{ transactionFee }}
          onSubmit={(values) => {
            dispatch(saveTransactionFee(String(values.transactionFee)));
            navigateTo(ROUTES.sendPaymentSettings);
          }}
        >
          {({ setFieldValue }) => (
            <Form>
              <FormRows>
                <Field name="transactionFee">
                  {({ field }: FieldProps) => (
                    <>
                      <Input
                        id="transaction-fee-input"
                        className="SendTo__input"
                        type="number"
                        {...field}
                      ></Input>
                      <div className="TransactionFee__row">
                        <TextLink
                          underline
                          disabled={field.value === recommendedFee}
                          variant={TextLink.variant.secondary}
                          onClick={() =>
                            setFieldValue("transactionFee", recommendedFee)
                          }
                        >
                          Set recommended
                        </TextLink>
                        <span>{networkCongestion} congestion</span>
                      </div>
                    </>
                  )}
                </Field>
              </FormRows>
              <div className="SendPayment__btn-continue">
                <Button
                  fullWidth
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
