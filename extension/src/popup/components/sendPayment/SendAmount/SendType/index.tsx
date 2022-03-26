import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Form, Formik } from "formik";
import { Button, Icon } from "@stellar/design-system";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { AutoSaveFields } from "popup/components/AutoSave";
import {
  saveDestinationAsset,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";

import "./styles.scss";

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
      <div
        className="SendType__btn-exit"
        onClick={() => navigateTo(ROUTES.sendPaymentAmount)}
      >
        <Icon.X />
      </div>
      <div className="SendPayment__header">SendType</div>
      <Formik
        initialValues={{ isPathPayment: String(destinationAsset !== "") }}
        onSubmit={(values) => {
          dispatch(
            saveDestinationAsset(
              values.isPathPayment === "true" ? "native" : "",
            ),
          );
        }}
      >
        <Form className="SendType__form">
          <AutoSaveFields />
          <RadioCheck
            name="isPathPayment"
            title="Same source and destination asset"
            value="false"
            subtext="Most common"
          />
          <RadioCheck
            name="isPathPayment"
            title="Different source and destination assets"
            value="true"
            subtext="Less common"
          />
        </Form>
      </Formik>
      <div className="SendPayment__btn-continue">
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          type="submit"
          onClick={() => navigateTo(ROUTES.sendPaymentAmount)}
        >
          Done
        </Button>
      </div>
    </PopupWrapper>
  );
};
