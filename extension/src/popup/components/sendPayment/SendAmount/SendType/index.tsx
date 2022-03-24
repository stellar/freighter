import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Field, Form, Formik } from "formik";
import { Button, Icon } from "@stellar/design-system";

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
  value: boolean;
}

const RadioCheck = ({ name, title, value }: RadioCheckProps) => (
  <label className="">
    {title}
    <Field className="" name={name} type="radio" value={value} />
    <div className="">
      <Icon.Check />
    </div>
  </label>
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
        initialValues={{ isPathPayment }}
        onSubmit={(values) => {
          dispatch(saveIsPathPayment(values.isPathPayment));
          navigateTo(ROUTES.sendPaymentAmount);
        }}
        enableReinitialize
      >
        <Form>
          <AutoSaveFields />
          <RadioCheck
            name="paymentTypeSelected"
            // ALEC TODO - need to add icon and subtitle
            title="Same source and destination asset"
            // ALEC TODO - constant
            value={false}
          />
          <RadioCheck
            name="paymentTypeSelected"
            // ALEC TODO - need to add icon and subtitle
            title="Different source and destination assets"
            // ALEC TODO - constant
            value={true}
          />
        </Form>
      </Formik>

      <div className="SendPayment__btn-continue">
        <Button fullWidth variant={Button.variant.tertiary} type="submit">
          Done
        </Button>
      </div>
    </PopupWrapper>
  );
};
