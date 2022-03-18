import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Formik, Form, Field, FieldProps } from "formik";
import BigNumber from "bignumber.js";

import StellarSdk from "stellar-sdk";
import { Button, Input, Icon, TextLink } from "@stellar/design-system";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { transactionDataSelector } from "popup/ducks/transactionSubmission";
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
      <div onClick={() => navigateTo(ROUTES.sendPaymentSettings)}>
        <Icon.X />
      </div>
      <div className="TransactionFee">
        <div className="header">Transaction Fee</div>
        <Formik initialValues={{ transactionFee }} onSubmit={() => {}}>
          {({ setFieldValue }) => (
            <Form>
              <Field name="transactionFee">
                {({ field }: FieldProps) => (
                  <Input
                    id="transaction-fee-input"
                    className="SendTo__input"
                    {...field}
                  ></Input>
                )}
              </Field>
              <TextLink
                underline
                variant={TextLink.variant.secondary}
                onClick={() => setFieldValue("transactionFee", recommendedFee)}
              >
                Set default
              </TextLink>
              <div>{networkCongestion} congestion</div>
              <Button
                fullWidth
                variant={Button.variant.tertiary}
                onClick={() => navigateTo(ROUTES.sendPaymentSettings)}
              >
                Done
              </Button>
            </Form>
          )}
        </Formik>
      </div>
    </PopupWrapper>
  );
};
