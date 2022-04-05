import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import { BigNumber } from "bignumber.js";
import { useFormik } from "formik";

import { Select, Icon, InfoBlock, Loader } from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import { PillButton } from "popup/basics/PillButton";
import { getAssetFromCanonical } from "helpers/stellar";
import { AppDispatch } from "popup/App";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { SubviewHeader } from "popup/components/SubviewHeader";
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

enum AMOUNT_ERROR {
  TOO_HIGH = "amount too high",
  DEC_MAX = "too many decimal digits",
}

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

  const validate = (values: { amount: string }) => {
    const val = values.amount.toString();
    if (new BigNumber(val).gt(new BigNumber(availBalance))) {
      return { amount: AMOUNT_ERROR.TOO_HIGH };
    }
    if (val.indexOf(".") !== -1 && val.split(".")[1].length > 7) {
      return { amount: AMOUNT_ERROR.DEC_MAX };
    }
    return {};
  };

  const formik = useFormik({
    initialValues: { amount, asset, destinationAsset },
    onSubmit: handleContinue,
    validate,
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

  const DecideWarning = () => {
    // unfunded destination
    if (
      shouldAccountDoesntExistWarning(
        destinationBalances.isFunded || false,
        asset,
        formik.values.amount || "0",
      )
    ) {
      return <AccountDoesntExistWarning />;
    }
    if (formik.errors.amount === AMOUNT_ERROR.TOO_HIGH) {
      return (
        <InfoBlock variant={InfoBlock.variant.error}>
          Entered amount is higher than your balance
        </InfoBlock>
      );
    }
    if (formik.errors.amount === AMOUNT_ERROR.DEC_MAX) {
      return (
        <InfoBlock variant={InfoBlock.variant.error}>
          7 digits after the decimal allowed
        </InfoBlock>
      );
    }
    return null;
  };

  return (
    <PopupWrapper>
      <SubviewHeader
        title={`Send ${getAssetFromCanonical(formik.values.asset).code}`}
        customBackAction={() => navigateTo(previous)}
        rightButton={
          <button
            onClick={() => navigateTo(ROUTES.sendPaymentType)}
            className="SendAmount__icon-slider"
          >
            <Icon.Sliders />
          </button>
        }
      />
      <div className="SendAmount">
        <div className="SendAmount__asset-copy">
          <span>{availBalance}</span>{" "}
          <span>{getAssetFromCanonical(formik.values.asset).code}</span>{" "}
          available
        </div>
        <div className="SendAmount__btn-set-max">
          <PillButton
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
          </PillButton>
        </div>
        <form
          className="SendAmount__form"
          onSubmit={(e) => {
            e.preventDefault();
            formik.submitForm();
          }}
        >
          <>
            <input
              className="SendAmount__input-amount"
              name="amount"
              type="number"
              placeholder="0.00"
              value={formik.values.amount}
              onChange={formik.handleChange}
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
              <DecideWarning />
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
              <div className="SendAmount__path-pay__select">
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
              <div className="SendAmount__path-pay__copy">
                Sending {getAssetFromCanonical(formik.values.asset).code}, they
                will receive{" "}
                {getAssetFromCanonical(formik.values.destinationAsset).code}
              </div>
            </>
          )}

          <div className="SendPayment__btn-continue">
            <Button
              disabled={loadingRate || !formik.values.amount || !formik.isValid}
              fullWidth
              variant={Button.variant.tertiary}
              type="submit"
            >
              Continue
            </Button>
          </div>
        </form>
      </div>
    </PopupWrapper>
  );
};
