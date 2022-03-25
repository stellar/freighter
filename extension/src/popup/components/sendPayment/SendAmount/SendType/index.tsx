import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Form, Formik } from "formik";
import { Button, DetailsTooltip, Icon } from "@stellar/design-system";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { AutoSaveFields } from "popup/components/AutoSave";
import {
  saveDestinationAsset,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";

// ALEC TODO - how are the SendPayment styles being uploaded?
import "./styles.scss";

// ALEC TODO - move to basic bc reused?
interface RadioCheckProps {
  name: string;
  title: string;
  value: string;
}

// ALEC TODO - figure out tooltop styling
const RadioCheck = ({ name, title, value }: RadioCheckProps) => (
  <>
    <label className="SendType--label SendType--radio-label">
      {title}
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
    <DetailsTooltip
      // TODO - add copy
      details=""
    >
      <span></span>
    </DetailsTooltip>
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
        <Form>
          <AutoSaveFields />
          <RadioCheck
            name="isPathPayment"
            title="Same source and destination asset"
            value="false"
          />
          <RadioCheck
            name="isPathPayment"
            title="Different source and destination assets"
            value="true"
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
