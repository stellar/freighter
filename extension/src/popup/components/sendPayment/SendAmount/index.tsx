import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import { BigNumber } from "bignumber.js";
import { useFormik } from "formik";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { Icon, Loader } from "@stellar/design-system";
import StellarSdk from "stellar-sdk";
import { useTranslation } from "react-i18next";

import {
  AssetSelect,
  PathPayAssetSelect,
} from "popup/components/sendPayment/SendAmount/AssetSelect";
import { InfoBlock } from "popup/basics/InfoBlock";
import { Button } from "popup/basics/buttons/Button";
import { PillButton } from "popup/basics/buttons/PillButton";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import { getAssetFromCanonical } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { LP_IDENTIFIER } from "popup/helpers/account";
import { emitMetric } from "helpers/metrics";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  transactionSubmissionSelector,
  saveAmount,
  saveAsset,
  saveDestinationAsset,
  getBestPath,
  resetDestinationAmount,
} from "popup/ducks/transactionSubmission";
import {
  AccountDoesntExistWarning,
  shouldAccountDoesntExistWarning,
} from "popup/components/sendPayment/SendTo";
import { BottomNav } from "popup/components/BottomNav";

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
}) => {
  const { t } = useTranslation();

  return (
    <div className="SendAmount__row__rate">
      {loading ? (
        <Loader />
      ) : (
        <>
          {destAmount ? (
            <span>
              1 {source} ≈{" "}
              {new BigNumber(destAmount)
                .div(new BigNumber(sourceAmount))
                .toFixed(7)}{" "}
              {dest}
            </span>
          ) : (
            <span>{t("no path found")}</span>
          )}
        </>
      )}
    </div>
  );
};

// default so can find a path even if user has not given input
const defaultSourceAmount = "1";

export const SendAmount = ({
  previous,
  next,
}: {
  previous: ROUTES;
  next: ROUTES;
}) => {
  const { t } = useTranslation();
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

  const isSwap = useIsSwap();
  const { recommendedFee } = useNetworkFees();
  const [loadingRate, setLoadingRate] = useState(false);

  const calculateAvailBalance = useCallback(
    (selectedAsset: string) => {
      let availBalance = "0";
      if (accountBalances.balances) {
        if (selectedAsset === "native") {
          // take base reserve into account for XLM payments
          const baseReserve = (2 + accountBalances.subentryCount) * 0.5;

          // needed for different wallet-sdk bignumber.js version
          const currentBal = new BigNumber(
            accountBalances.balances[selectedAsset].total.toFixed(),
          );
          availBalance = currentBal
            .minus(new BigNumber(baseReserve))
            .minus(new BigNumber(Number(recommendedFee)))
            .toFixed();
        } else {
          availBalance = accountBalances.balances[
            selectedAsset
          ].total.toFixed();
        }
      }

      return availBalance;
    },
    [accountBalances.balances, accountBalances.subentryCount, recommendedFee],
  );

  const [availBalance, setAvailBalance] = useState(
    calculateAvailBalance(asset),
  );

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

    navigateTo(next);
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
    enableReinitialize: true,
  });

  const showSourceAndDestAsset = !!formik.values.destinationAsset;
  const parsedSourceAsset = getAssetFromCanonical(formik.values.asset);
  const parsedDestAsset = getAssetFromCanonical(
    formik.values.destinationAsset || "native",
  );

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

  useEffect(() => {
    setAvailBalance(calculateAvailBalance(formik.values.asset));
  }, [calculateAvailBalance, formik.values.asset]);

  // on asset select get conversion rate
  useEffect(() => {
    if (!formik.values.destinationAsset) return;
    setLoadingRate(true);
    // clear dest amount before re-calculating for UI
    dispatch(resetDestinationAmount());
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
    dispatch,
  ]);

  // for swaps we're loading and choosing the default destinationAsset here
  useEffect(() => {
    if (isSwap && !destinationAsset) {
      let defaultDestAsset;

      // if pre-chosen source asset (eg. from AssetDetails) not XLM, default dest asset to XLM
      if (formik.values.asset !== StellarSdk.Asset.native().toString()) {
        defaultDestAsset = StellarSdk.Asset.native().toString();
      } else {
        // otherwise default to first non-native asset if exists
        const nonXlmAssets = Object.keys(accountBalances.balances || {}).filter(
          (b) =>
            b !== StellarSdk.Asset.native().toString() &&
            b.indexOf(LP_IDENTIFIER) === -1,
        );
        defaultDestAsset = nonXlmAssets[0]
          ? nonXlmAssets[0]
          : StellarSdk.Asset.native().toString();
      }

      dispatch(saveDestinationAsset(defaultDestAsset));
    }
  }, [
    isSwap,
    dispatch,
    destinationAsset,
    accountBalances,
    formik.values.asset,
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
      !isSwap &&
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
          {t("Entered amount is higher than your balance")}
        </InfoBlock>
      );
    }
    if (formik.errors.amount === AMOUNT_ERROR.DEC_MAX) {
      return (
        <InfoBlock variant={InfoBlock.variant.error}>
          7 {t("digits after the decimal allowed")}
        </InfoBlock>
      );
    }
    return null;
  };

  return (
    <>
      <div className={`SendAmount ${isSwap ? "SendAmount__full-height" : ""}`}>
        <SubviewHeader
          title={`${isSwap ? "Swap" : "Send"} ${parsedSourceAsset.code}`}
          hasBackButton={!isSwap}
          customBackAction={() => navigateTo(previous)}
          rightButton={
            isSwap ? null : (
              <button
                onClick={() => navigateTo(ROUTES.sendPaymentType)}
                className="SendAmount__icon-slider"
              >
                <Icon.Sliders />
              </button>
            )
          }
        />
        <div className="SendAmount__content">
          <div className="SendAmount__asset-copy">
            <span>{availBalance}</span> <span>{parsedSourceAsset.code}</span>{" "}
            {t("available")}
          </div>
          <div className="SendAmount__btn-set-max">
            <PillButton
              onClick={() => {
                emitMetric(METRIC_NAMES.sendPaymentSetMax);
                formik.setFieldValue(
                  "amount",
                  calculateAvailBalance(formik.values.asset),
                );
              }}
            >
              {t("SET MAX")}
            </PillButton>
          </div>

          <form
            className="SendAmount__form"
            onSubmit={(e) => {
              e.preventDefault();
              formik.submitForm();
            }}
          >
            <SimpleBar
              className={`${
                isSwap
                  ? "SendAmount__simplebar"
                  : "SendAmount__simplebar__full-height"
              }`}
            >
              <div className="SendAmount__simplebar__content">
                <input
                  className={`SendAmount__input-amount ${
                    isSwap ? "SendAmount__input-amount__full-height" : ""
                  } SendAmount__${getAmountFontSize()}`}
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
                  {parsedSourceAsset.code}
                </div>
                {showSourceAndDestAsset && formik.values.amount !== "0" && (
                  <ConversionRate
                    loading={loadingRate}
                    source={parsedSourceAsset.code}
                    sourceAmount={formik.values.amount || defaultSourceAmount}
                    dest={parsedDestAsset.code}
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
                <div className="SendAmount__asset-select-container">
                  {!showSourceAndDestAsset && (
                    <AssetSelect
                      assetCode={parsedSourceAsset.code}
                      issuerKey={parsedSourceAsset.issuer}
                    />
                  )}
                  {showSourceAndDestAsset && (
                    <>
                      <PathPayAssetSelect
                        source={true}
                        assetCode={parsedSourceAsset.code}
                        issuerKey={parsedSourceAsset.issuer}
                        balance={formik.values.amount}
                      />
                      <PathPayAssetSelect
                        source={false}
                        assetCode={parsedDestAsset.code}
                        issuerKey={parsedDestAsset.issuer}
                        balance={
                          destinationAmount
                            ? new BigNumber(destinationAmount).toFixed(2)
                            : "0"
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            </SimpleBar>
            <div className="SendAmount__btn-continue">
              <Button
                disabled={
                  loadingRate ||
                  formik.values.amount === "0" ||
                  !formik.isValid ||
                  // path payment, but path not found
                  (showSourceAndDestAsset && !destinationAmount)
                }
                fullWidth
                variant={Button.variant.tertiary}
                type="submit"
              >
                {t("Continue")}
              </Button>
            </div>
          </form>
        </div>
      </div>
      {isSwap && <BottomNav />}
    </>
  );
};
