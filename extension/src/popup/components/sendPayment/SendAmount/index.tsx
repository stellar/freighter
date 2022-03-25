import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BigNumber } from "bignumber.js";
import { Field, Form, Formik, FieldProps } from "formik";
import { Asset, Server } from "stellar-sdk";

import { Button, Select, Icon, InfoBlock } from "@stellar/design-system";

import { getAssetFromCanonical } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { FormRows } from "popup/basics/Forms";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { BackButton } from "popup/basics/BackButton";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  transactionSubmissionSelector,
  saveAmount,
  saveAsset,
  saveDestinationAsset,
} from "popup/ducks/transactionSubmission";
import {
  AccountDoesntExistWarning,
  shouldAccountDoesntExistWarning,
} from "popup/components/sendPayment/SendTo";

import "../styles.scss";

export const SendAmount = ({ previous }: { previous: ROUTES }) => {
  const dispatch = useDispatch();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const { accountBalances, destinationBalances, transactionData } = useSelector(
    transactionSubmissionSelector,
  );
  // const { amount, asset, destinationAsset } = transactionData;

  // ALEC TODO - remove
  console.log({ transactionData });
  const amount = "100";
  const asset = "native";
  // const destinationAsset = "native";
  const destinationAsset =
    "HUG:GD4PLJJJK4PN7BETZLVQBXMU6JQJADKHSAELZZVFBPLNRIXRQSM433II";

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

  const handleContinue = (values: {
    amount: string;
    asset: string;
    destinationAsset: string;
  }) => {
    dispatch(saveAmount(String(values.amount)));
    // ALEC TODO - changed from using assetInfo, make sure not broken
    dispatch(saveAsset(values.asset));
    if (values.destinationAsset) {
      dispatch(saveDestinationAsset(values.destinationAsset));
    }
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

  // get conversion rate
  useEffect(() => {
    if (!destinationAsset) return;
    (async () => {
      const server = new Server(networkDetails.networkUrl);
      const builder = server.strictSendPaths(
        getAssetFromCanonical(asset),
        amount,
        [getAssetFromCanonical(destinationAsset)],
      );
      // ALEC TODO - remove
      console.log({ builder });

      const paths = await builder.call();
      // ALEC TODO - remove
      console.log({ paths });
    })();
  }, [networkDetails, asset, amount, destinationAsset]);

  return (
    <PopupWrapper>
      <div className="SendAmount__top-btns">
        <BackButton customBackAction={() => navigateTo(previous)} />
        <button
          onClick={() => navigateTo(ROUTES.sendPaymentType)}
          className="SendAmount__top-btns__slider"
        >
          <Icon.Sliders />
        </button>
      </div>
      <div className="SendAmount">
        <div className="SendPayment__header">Send {assetInfo.code}</div>
        <div className="SendAmount__asset-copy">
          <span>{assetInfo.balance.toString()}</span>{" "}
          <span>{assetInfo.code}</span> available
        </div>

        <Formik
          initialValues={{ amount, asset, destinationAsset }}
          onSubmit={handleContinue}
        >
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
                      <>
                        {/* ALEC TODO - figure out styling */}
                        {/* <div className="SendAmount__input-select"> */}
                        <div>
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
                      </>
                    )}
                  </Field>
                  {destinationAsset && (
                    <>
                      <Field name="destinationAsset">
                        {({ field }: FieldProps) => (
                          <div className="">
                            <Select
                              id="destAsset-select"
                              {...field}
                              onChange={(e) => {
                                // handleDestinationAssetSelect(e);
                                setFieldValue(
                                  "destinationAsset",
                                  e.target.value,
                                );
                              }}
                            >
                              {destinationBalances.balances &&
                                Object.entries(
                                  destinationBalances.balances,
                                ).map(([k, v]) => (
                                  <option key={k} value={k}>
                                    {v.token.code}
                                  </option>
                                ))}
                            </Select>
                          </div>
                        )}
                      </Field>
                    </>
                  )}
                </FormRows>
                <div className="SendPayment__btn-continue">
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
