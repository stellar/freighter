import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Form, Formik } from "formik";
import { Button, DetailsTooltip, Icon } from "@stellar/design-system";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { AutoSaveFields } from "popup/components/AutoSave";
import {
  saveIsPathPayment,
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
  const { isPathPayment } = useSelector(transactionDataSelector);
  return (
    <PopupWrapper>
      <div
        className="SendType__btn-exit"
        onClick={() => navigateTo(ROUTES.sendPaymentAmount)}
      >
        <Icon.X />
      </div>
      <div className="SendPayment__header">SendType</div>

      {/* ALEC TODO - need enableReinitialize ? */}
      <Formik
        initialValues={{ isPathPayment: String(isPathPayment) }}
        onSubmit={(values) => {
          dispatch(saveIsPathPayment(values.isPathPayment === "true"));
        }}
        enableReinitialize
      >
        <Form>
          <AutoSaveFields />
          <RadioCheck
            name="isPathPayment"
            // ALEC TODO - need to add icon and subtitle
            title="Same source and destination asset"
            // ALEC TODO - constant
            value="false"
          />
          <RadioCheck
            name="isPathPayment"
            // ALEC TODO - need to add icon and subtitle
            title="Different source and destination assets"
            // ALEC TODO - constant
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
