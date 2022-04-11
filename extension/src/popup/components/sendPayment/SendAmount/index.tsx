import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import { BigNumber } from "bignumber.js";
import { useFormik } from "formik";
import { Types } from "@stellar/wallet-sdk";
import { Select, Icon, Loader } from "@stellar/design-system";
import StellarSdk from "stellar-sdk";

import { InfoBlock } from "popup/basics/InfoBlock";
import { Button } from "popup/basics/buttons/Button";
import { PillButton } from "popup/basics/buttons/PillButton";
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

const BalanceOption = ({
  balance: [key, balance],
}: {
  balance: [string, Types.AssetBalance | Types.NativeBalance];
}) => {
  const [assetDomain, setAssetDomain] = useState("stellar.org");
  const assetCode = balance.token.code;
  const assetIssuer = "issuer" in balance.token ? balance.token.issuer.key : "";
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const server = new StellarSdk.Server(networkDetails.networkUrl);

  useEffect(() => {
    const fetchAssetDomain = async () => {
      let homeDomain = "";
      // https://github.com/stellar/freighter/issues/410
      try {
        ({ home_domain: homeDomain } = await server.loadAccount(assetIssuer));
      } catch (e) {
        console.error(e);
      }

      setAssetDomain(homeDomain);
    };

    if (balance.token.type !== "native") {
      fetchAssetDomain();
    }
  }, [assetCode, assetIssuer, server, balance.token.type]);

  return (
    <option key={key} value={key}>
      {assetCode} &bull; {assetDomain}
    </option>
  );
};

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
    dispatch(saveAmount(cleanAmount(values.amount)));
    dispatch(saveAsset(values.asset));
    if (values.destinationAsset) {
      dispatch(saveDestinationAsset(values.destinationAsset));
    }
    navigateTo(ROUTES.sendPaymentSettings);
  };

  const validate = (values: { amount: string }) => {
    const val = cleanAmount(values.amount);
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

  const getAmountFontSize = () => {
    const length = formik.values.amount.length;
    if (length <= 9) {
      return "";
    }
    if (length <= 15) {
      return "med";
    }
    return "small";
  };

  // remove non digits and decimal
  const cleanAmount = (s: string) => s.replace(/[^0-9.]/g, "");

  const formatAmount = (val: string) => {
    const decimal = new Intl.NumberFormat("en-US", { style: "decimal" });
    const maxDigits = 16;
    const cleaned = cleanAmount(val);
    // add commas to pre decimal digits
    if (cleaned.indexOf(".") !== -1) {
      const parts = cleaned.split(".");
      parts[0] = decimal
        .format(Number(parts[0].slice(0, maxDigits)))
        .toString();
      parts[1] = parts[1].slice(0, 7);
      return `${parts[0]}.${parts[1]}`;
    }
    return decimal.format(Number(cleaned.slice(0, maxDigits))).toString();
  };

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
              className={`SendAmount__input-amount SendAmount__${getAmountFontSize()}`}
              name="amount"
              type="text"
              placeholder="0"
              value={formik.values.amount}
              onChange={(e) =>
                formik.setFieldValue("amount", formatAmount(e.target.value))
              }
              autoFocus
              autoComplete="off"
            />
            <div className="SendAmount__input-amount__asset-copy">
              {getAssetFromCanonical(formik.values.asset).code}
            </div>
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
                  <BalanceOption balance={[k, v]} />
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
                    Object.entries(
                      destinationBalances.balances,
                    ).map(([k, v]) => <BalanceOption balance={[k, v]} />)}
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
              disabled={
                loadingRate || formik.values.amount === "0" || !formik.isValid
              }
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
