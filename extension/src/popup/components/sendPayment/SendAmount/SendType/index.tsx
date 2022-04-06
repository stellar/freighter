import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Form, Formik } from "formik";
import { Icon } from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { SubviewHeader } from "popup/components/SubviewHeader";
import {
  saveDestinationAsset,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";

import "./styles.scss";

enum PAYMENT_TYPES {
  REGULAR = "REGULAR",
  PATH_PAYMENT = "PATH_PAYMENT",
}

interface RadioCheckProps {
  name: string;
  title: string;
  subtext: string;
  value: string;
}

const RadioCheck = ({ name, title, subtext, value }: RadioCheckProps) => (
  <>
    <label className="SendType--label SendType--radio-label">
      <div className="SendType__title">
        {/* TODO - tooltip copy */}
        {title}
        {subtext && <span className="SendType__title__subtext">{subtext}</span>}
      </div>
      <Field
        className="SendType--radio-field"
        name={name}
        type="radio"
        value={value}
      />
      <div className="SendType--radio-check">
        <Icon.Check />
      </div>
    </label>
  </>
);

export const SendType = () => {
  const dispatch = useDispatch();
  const { destinationAsset } = useSelector(transactionDataSelector);
  return (
    <PopupWrapper>
      <SubviewHeader
        title="Send Type"
        customBackAction={() => navigateTo(ROUTES.sendPaymentAmount)}
        customBackIcon={<Icon.X />}
      />
      <Formik
        initialValues={{
          paymentType:
            destinationAsset === ""
              ? PAYMENT_TYPES.REGULAR
              : PAYMENT_TYPES.PATH_PAYMENT,
        }}
        onSubmit={(values) => {
          // path payment flag is a non empty string in redux destinationAsset
          dispatch(
            saveDestinationAsset(
              values.paymentType === PAYMENT_TYPES.PATH_PAYMENT ? "native" : "",
            ),
          );
          navigateTo(ROUTES.sendPaymentAmount);
        }}
      >
        <Form>
          <RadioCheck
            name="paymentType"
            title="Same source and destination asset"
            value={PAYMENT_TYPES.REGULAR}
            subtext="Most common"
          />
          <RadioCheck
            name="paymentType"
            title="Different source and destination assets"
            value={PAYMENT_TYPES.PATH_PAYMENT}
            subtext="Less common"
          />
          <div className="SendPayment__btn-continue">
            <Button fullWidth variant={Button.variant.tertiary} type="submit">
              Done
            </Button>
          </div>
        </Form>
      </Formik>
    </PopupWrapper>
  );
};
