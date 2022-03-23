import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik, Form, Field, FieldProps } from "formik";

import StellarSdk from "stellar-sdk";
import {
  Button,
  Input,
  Icon,
  TextLink,
  DetailsTooltip,
} from "@stellar/design-system";
import { stroopToXlm } from "helpers/stellar";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { FormRows } from "popup/basics/Forms";
import {
  saveTransactionFee,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import "./styles.scss";

enum NetworkCongestion {
  LOW = "Low",
  MEDIUM = "Medium",
  HIGH = "High",
}

export const SendSettingsFee = () => {
  const dispatch = useDispatch();
  const { transactionFee } = useSelector(transactionDataSelector);
  const { networkUrl } = useSelector(settingsNetworkDetailsSelector);
  const [recommendedFee, setRecommendedFee] = useState("");
  const [networkCongestion, setNetworkCongestion] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const server = new StellarSdk.Server(networkUrl);
        const {
          fee_charged: feeCharged,
          ledger_capacity_usage: ledgerCapacityUsage,
        } = await server.feeStats();
        setRecommendedFee(stroopToXlm(feeCharged.mode).toString());
        if (ledgerCapacityUsage > 0.5 && ledgerCapacityUsage <= 0.75) {
          setNetworkCongestion(NetworkCongestion.MEDIUM);
        } else if (ledgerCapacityUsage > 0.75) {
          setNetworkCongestion(NetworkCongestion.HIGH);
        } else {
          setNetworkCongestion(NetworkCongestion.LOW);
        }
      } catch {
        // use default values
      }
    })();
  }, [networkUrl]);

  return (
    <PopupWrapper>
      <div className="TransactionFee__top-btns">
        <div
          className="TransactionFee__top-btns__exit"
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
      <div className="TransactionFee">
        <div className="SendPayment__header">Transaction Fee</div>
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
                    <Input
                      id="transaction-fee-input"
                      className="SendTo__input"
                      type="number"
                      {...field}
                    ></Input>
                  )}
                </Field>
                <div className="TransactionFee__row">
                  <TextLink
                    underline
                    variant={TextLink.variant.secondary}
                    onClick={() =>
                      setFieldValue("transactionFee", recommendedFee)
                    }
                  >
                    Set default
                  </TextLink>
                  <span>{networkCongestion} congestion</span>
                </div>
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
