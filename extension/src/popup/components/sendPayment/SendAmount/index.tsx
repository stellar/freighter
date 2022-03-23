import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BigNumber } from "bignumber.js";
import { Field, Form, Formik, FieldProps } from "formik";
import { Asset } from "stellar-sdk";

import { Button, Select, InfoBlock } from "@stellar/design-system";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { FormRows } from "popup/basics/Forms";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { BackButton } from "popup/basics/BackButton";
import {
  transactionSubmissionSelector,
  saveAmount,
  saveAsset,
} from "popup/ducks/transactionSubmission";
import { AccountDoesntExistWarning } from "popup/components/sendPayment/SendTo";

import "../styles.scss";

// ALEC TODO - move somewhere
export const baseReserve = new BigNumber(1);

export const shouldAccountDoesntExistWarning = (
  isFunded: boolean,
  assetID: string,
  amount: string,
) => {
  if (
    !isFunded &&
    (new BigNumber(amount).lt(baseReserve) ||
      assetID !== Asset.native().toString())
  ) {
    return true;
  }
  return false;
};

export const SendAmount = ({ previous }: { previous: ROUTES }) => {
  const dispatch = useDispatch();
  const { accountBalances, destinationBalances, transactionData } = useSelector(
    transactionSubmissionSelector,
  );
  const { amount, asset } = transactionData;

  const [assetInfo, setAssetInfo] = useState({
    code: Asset.native().code,
    balance: "0",
    canonical: Asset.native().toString(),
  });

  useEffect(() => {
    if (accountBalances.balances) {
      setAssetInfo({
        code: accountBalances.balances[asset].token.code,
        balance: accountBalances.balances[asset].total.toString(),
        canonical: asset,
      });
    }
  }, [asset, accountBalances]);

  const handleContinue = (values: { amount: string }) => {
    dispatch(saveAmount(String(values.amount)));
    dispatch(saveAsset(assetInfo.canonical));
    navigateTo(ROUTES.sendPaymentSettings);
  };

  const handleAssetSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    if (accountBalances.balances) {
      setAssetInfo({
        code: accountBalances.balances[selected].token.code,
        balance: accountBalances.balances[selected].total.toString(),
        canonical: selected,
      });
    }
  };

  const decideWarning = (val: string) => {
    // unfunded destination
    if (
      shouldAccountDoesntExistWarning(
        destinationBalances.isFunded || false,
        asset,
        val,
      )
    ) {
      return <AccountDoesntExistWarning />;
    }
    // amount too high
    if (new BigNumber(val).gt(new BigNumber(assetInfo.balance))) {
      return (
        <InfoBlock variant={InfoBlock.variant.error}>
          Entered amount is higher than your balance
        </InfoBlock>
      );
    }
    return null;
  };

  return (
    <PopupWrapper>
      {/* TODO - add payment type icon */}
      <BackButton customBackAction={() => navigateTo(previous)} />
      <div className="SendAmount">
        <div className="header">Send {assetInfo.code}</div>
        <div className="SendAmount__asset-copy">
          <span>{assetInfo.balance.toString()}</span>{" "}
          <span>{assetInfo.code}</span> available
        </div>

        <Formik initialValues={{ amount, asset }} onSubmit={handleContinue}>
          {({ setFieldValue, values }) => (
            <>
              <div className="SendAmount__btn-set-max">
                <Button
                  variant={Button.variant.tertiary}
                  onClick={() => {
                    if (accountBalances.balances) {
                      setFieldValue(
                        "amount",
                        accountBalances.balances[values.asset].total.toString(),
                      );
                    }
                  }}
                >
                  SET MAX
                </Button>
              </div>
              <Form className="SendAmount__form">
                <FormRows>
                  <Field name="amount">
                    {({ field }: FieldProps) => (
                      <>
                        <input
                          className="SendAmount__input-amount"
                          type="number"
                          placeholder="0.00"
                          {...field}
                        />
                        {decideWarning(field.value || "0")}
                      </>
                    )}
                  </Field>
                  <Field name="asset">
                    {({ field }: FieldProps) => (
                      <div className="SendAmount__input-select">
                        <Select
                          id="asset-select"
                          {...field}
                          onChange={(e) => {
                            handleAssetSelect(e);
                            setFieldValue("asset", e.target.value);
                          }}
                        >
                          {accountBalances.balances &&
                            Object.entries(accountBalances.balances).map(
                              ([k, v]) => (
                                <option key={k} value={k}>
                                  {v.token.code}
                                </option>
                              ),
                            )}
                        </Select>
                      </div>
                    )}
                  </Field>
                </FormRows>
                <div className="btn-continue">
                  <Button
                    fullWidth
                    variant={Button.variant.tertiary}
                    type="submit"
                  >
                    Continue
                  </Button>
                </div>
              </Form>
            </>
          )}
        </Formik>
      </div>
    </PopupWrapper>
  );
};
