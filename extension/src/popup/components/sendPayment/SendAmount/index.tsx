import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import { BigNumber } from "bignumber.js";
import { useFormik } from "formik";

import {
  Button,
  Select,
  Icon,
  InfoBlock,
  Loader,
} from "@stellar/design-system";

import { getAssetFromCanonical } from "helpers/stellar";
import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { BackButton } from "popup/basics/BackButton";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  transactionSubmissionSelector,
  saveAmount,
  saveAsset,
  saveDestinationAsset,
  getBestPath,
} from "popup/ducks/transactionSubmission";
import {
  AccountDoesntExistWarning,
  shouldAccountDoesntExistWarning,
} from "popup/components/sendPayment/SendTo";

import "../styles.scss";

const ConversionRate = ({
  source,
  sourceAmount,
  dest,
  destAmount,
  loading,
}: {
  source: string;
  sourceAmount: string;
  dest: string;
  destAmount: string;
  loading: boolean;
}) => (
  <div className="SendAmount__row__rate">
    {loading ? (
      <Loader />
    ) : (
      <>
        {destAmount ? (
          <span>
            {sourceAmount} {source} ≈ {destAmount} {dest}
          </span>
        ) : (
          <span>no path found</span>
        )}
      </>
    )}
  </div>
);

// default so can find a path even if user has not given input
const defaultSourceAmount = "1";

export const SendAmount = ({ previous }: { previous: ROUTES }) => {
  const dispatch: AppDispatch = useDispatch();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const { accountBalances, destinationBalances, transactionData } = useSelector(
    transactionSubmissionSelector,
  );
  const {
    amount,
    asset,
    destinationAmount,
    destinationAsset,
  } = transactionData;

  const [availBalance, setAvailBalance] = useState(
    accountBalances.balances
      ? accountBalances.balances[asset].total.toString()
      : "0",
  );

  const [loadingRate, setLoadingRate] = useState(false);

  const handleContinue = (values: {
    amount: string;
    asset: string;
    destinationAsset: string;
  }) => {
    dispatch(saveAmount(String(values.amount)));
    dispatch(saveAsset(values.asset));
    if (values.destinationAsset) {
      dispatch(saveDestinationAsset(values.destinationAsset));
    }
    navigateTo(ROUTES.sendPaymentSettings);
  };

  const formik = useFormik({
    initialValues: { amount, asset, destinationAsset },
    onSubmit: handleContinue,
  });

  const db = useCallback(
    debounce(async (formikAm, sourceAsset, destAsset) => {
      await dispatch(
        getBestPath({
          amount: formikAm,
          sourceAsset,
          destAsset,
          networkDetails,
        }),
      );
      setLoadingRate(false);
    }, 2000),
    [],
  );

  // on asset select get conversion rate
  useEffect(() => {
    if (!formik.values.destinationAsset) return;
    setLoadingRate(true);
    db(
      formik.values.amount || defaultSourceAmount,
      formik.values.asset,
      formik.values.destinationAsset,
    );
  }, [
    db,
    networkDetails,
    formik.values.asset,
    formik.values.destinationAsset,
    formik.values.amount,
  ]);

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
    if (new BigNumber(val).gt(new BigNumber(availBalance))) {
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
        <div className="SendPayment__header">
          Send {getAssetFromCanonical(formik.values.asset).code}
        </div>
        <div className="SendAmount__asset-copy">
          <span>{availBalance}</span>{" "}
          <span>{getAssetFromCanonical(formik.values.asset).code}</span>{" "}
          available
        </div>
        <div className="SendAmount__btn-set-max">
          <Button
            variant={Button.variant.tertiary}
            onClick={() => {
              if (accountBalances.balances) {
                formik.setFieldValue(
                  "amount",
                  accountBalances.balances[
                    formik.values.asset
                  ].total.toString(),
                );
              }
            }}
          >
            SET MAX
          </Button>
        </div>
        <form className="SendAmount__form">
          <>
            <input
              className="SendAmount__input-amount"
              name="amount"
              type="number"
              placeholder="0.00"
              value={formik.values.amount}
              onChange={(e) => formik.setFieldValue("amount", e.target.value)}
            />
            {destinationAsset && (
              <ConversionRate
                loading={loadingRate}
                source={getAssetFromCanonical(formik.values.asset).code}
                sourceAmount={formik.values.amount || defaultSourceAmount}
                dest={
                  getAssetFromCanonical(formik.values.destinationAsset).code
                }
                destAmount={destinationAmount}
              />
            )}
            <div
              className={`SendAmount__amount-warning${
                destinationAsset ? "__path-payment" : ""
              }`}
            >
              {decideWarning(formik.values.amount || "0")}
            </div>
          </>
          <div>
            <Select
              id="asset-select"
              name="asset"
              value={formik.values.asset}
              onChange={(e) => {
                if (accountBalances.balances) {
                  setAvailBalance(
                    accountBalances.balances[e.target.value].total.toString(),
                  );
                }
                formik.setFieldValue("asset", e.target.value);
              }}
            >
              {accountBalances.balances &&
                Object.entries(accountBalances.balances).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.token.code}
                  </option>
                ))}
            </Select>
          </div>
          {destinationAsset && (
            <>
              <div className="SendAmount__row__icon">
                <Icon.ArrowDownCircle />
              </div>
              <div>
                <Select
                  id="destAsset-select"
                  name="destinationAsset"
                  value={formik.values.destinationAsset}
                  onChange={(e) =>
                    formik.setFieldValue("destinationAsset", e.target.value)
                  }
                >
                  {destinationBalances.balances &&
                    Object.entries(destinationBalances.balances).map(
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
        </form>
        <div className="SendPayment__btn-continue">
          <Button
            disabled={loadingRate}
            fullWidth
            variant={Button.variant.tertiary}
            onClick={formik.submitForm}
          >
            Continue
          </Button>
        </div>
      </div>
    </PopupWrapper>
  );
};
