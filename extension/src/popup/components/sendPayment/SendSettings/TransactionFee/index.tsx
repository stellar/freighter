import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Formik, Form, Field, FieldProps } from "formik";
import BigNumber from "bignumber.js";

import StellarSdk from "stellar-sdk";
import {
  Button,
  Input,
  Icon,
  TextLink,
  IconButton,
} from "@stellar/design-system";

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

const lumensFromStroops = (stroops: BigNumber | string): BigNumber => {
  if (stroops instanceof BigNumber) {
    return stroops.dividedBy(1e7);
  }
  return new BigNumber(Number(stroops) / 1e7);
};

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
        setRecommendedFee(lumensFromStroops(feeCharged.mode).toString());
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
      <div
        className="TransactionFee__top__left"
        onClick={() => navigateTo(ROUTES.sendPaymentSettings)}
      >
        <Icon.X />
      </div>
      {/* TODO add icon tooltip copy */}
      <div className="TransactionFee__top__right">
        <IconButton altText="Default" icon={<Icon.Info />} />
      </div>
      <div className="TransactionFee">
        <div className="header">Transaction Fee</div>
        <Formik
          initialValues={{ transactionFee }}
          onSubmit={(values) => {
            dispatch(saveTransactionFee(values.transactionFee));
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
              <div className="btn-continue">
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
