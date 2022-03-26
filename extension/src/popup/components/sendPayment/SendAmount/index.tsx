import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import { BigNumber } from "bignumber.js";
import { Field, Form, Formik, FieldProps } from "formik";

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
  getConversionRate,
  saveConversionRate,
} from "popup/ducks/transactionSubmission";
import {
  AccountDoesntExistWarning,
  shouldAccountDoesntExistWarning,
} from "popup/components/sendPayment/SendTo";

import "../styles.scss";

const ConversionRate = ({
  source,
  dest,
  rate,
  loading,
}: {
  source: string;
  dest: string;
  rate: string;
  loading: boolean;
}) => (
  <div className="SendAmount__row__rate">
    {loading ? (
      <Loader />
    ) : (
      <>
        {rate ? (
          <span>
            1 {source} ≈ {rate} {dest}
          </span>
        ) : (
          <span>no path found</span>
        )}
      </>
    )}
  </div>
);

export const SendAmount = ({ previous }: { previous: ROUTES }) => {
  const dispatch: AppDispatch = useDispatch();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const { accountBalances, destinationBalances, transactionData } = useSelector(
    transactionSubmissionSelector,
  );
  const { amount, asset, destinationAsset } = transactionData;

  const [assetInfo, setAssetInfo] = useState({
    code: accountBalances.balances
      ? accountBalances.balances[asset].token.code
      : "XLM",
    balance: accountBalances.balances
      ? accountBalances.balances[asset].total.toString()
      : "0",
    canonical: asset || "native",
  });
  const [selectedDestAsset, setSelectedDestAsset] = useState(destinationAsset);
  const [conversionRate, setConversionRate] = useState("");
  const [loadingRate, setLoadingRate] = useState(false);

  const db = useCallback(
    debounce(async (sourceAsset, destAsset) => {
      const resp = await dispatch(
        getConversionRate({ sourceAsset, destAsset, networkDetails }),
      );
      if (getConversionRate.fulfilled.match(resp)) {
        setConversionRate(resp.payload);
      }
      setLoadingRate(false);
    }, 2000),
    [],
  );

  // on asset select get conversion rate
  useEffect(() => {
    if (!destinationAsset) return;
    setLoadingRate(true);
    db(assetInfo.canonical, selectedDestAsset);
  }, [db, networkDetails, assetInfo, selectedDestAsset, destinationAsset]);

  const handleContinue = (values: {
    amount: string;
    asset: string;
    destinationAsset: string;
  }) => {
    dispatch(saveAmount(String(values.amount)));
    dispatch(saveAsset(values.asset));
    if (values.destinationAsset) {
      dispatch(saveDestinationAsset(values.destinationAsset));
      dispatch(saveConversionRate(conversionRate));
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
                <Field name="amount">
                  {({ field }: FieldProps) => (
                    <>
                      <input
                        className="SendAmount__input-amount"
                        type="number"
                        placeholder="0.00"
                        {...field}
                      />
                      {destinationAsset && (
                        <ConversionRate
                          loading={loadingRate}
                          source={assetInfo.code}
                          dest={getAssetFromCanonical(selectedDestAsset).code}
                          rate={conversionRate}
                        />
                      )}
                      <div
                        className={`SendAmount__amount-warning${
                          destinationAsset ? "__path-payment" : ""
                        }`}
                      >
                        {decideWarning(field.value || "0")}
                      </div>
                    </>
                  )}
                </Field>

                <Field name="asset">
                  {({ field }: FieldProps) => (
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
                  )}
                </Field>
                {destinationAsset && (
                  <>
                    <div className="SendAmount__row__icon">
                      <Icon.ArrowDownCircle />
                    </div>
                    <Field name="destinationAsset">
                      {({ field }: FieldProps) => (
                        <div>
                          <Select
                            id="destAsset-select"
                            {...field}
                            onChange={(e) => {
                              setSelectedDestAsset(e.target.value);
                              setFieldValue("destinationAsset", e.target.value);
                            }}
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
                      )}
                    </Field>
                  </>
                )}
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
