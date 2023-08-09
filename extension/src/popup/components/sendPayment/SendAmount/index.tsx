import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import { BigNumber } from "bignumber.js";
import { useFormik } from "formik";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";
import StellarSdk from "stellar-sdk";
import { useTranslation } from "react-i18next";

import { SimpleBarWrapper } from "popup/basics/SimpleBarWrapper";
import {
  AssetSelect,
  PathPayAssetSelect,
} from "popup/components/sendPayment/SendAmount/AssetSelect";
import { PillButton } from "popup/basics/buttons/PillButton";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import { getAssetFromCanonical } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { LP_IDENTIFIER } from "popup/helpers/account";
import { emitMetric } from "helpers/metrics";
import { useRunAfterUpdate } from "popup/helpers/useRunAfterUpdate";
import { getAssetDecimals, getTokenBalance } from "popup/helpers/soroban";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  cleanAmount,
  formatAmount,
  formatAmountPreserveCursor,
} from "popup/helpers/formatters";
import {
  transactionSubmissionSelector,
  saveAmount,
  saveAsset,
  saveDestinationAsset,
  getBestPath,
  resetDestinationAmount,
} from "popup/ducks/transactionSubmission";
import { sorobanSelector } from "popup/ducks/soroban";
import {
  AccountDoesntExistWarning,
  shouldAccountDoesntExistWarning,
} from "popup/components/sendPayment/SendTo";
import { BottomNav } from "popup/components/BottomNav";
import { ScamAssetWarning } from "popup/components/WarningMessages";
import { TX_SEND_MAX } from "popup/constants/transaction";

import "../styles.scss";

const BASE_RESERVE = 0.5 as const;

enum AMOUNT_ERROR {
  TOO_HIGH = "amount too high",
  DEC_MAX = "too many decimal digits",
  SEND_MAX = "amount higher than send max",
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
  const runAfterUpdate = useRunAfterUpdate();

  const {
    accountBalances,
    destinationBalances,
    transactionData,
    assetDomains,
    blockedDomains,
    assetIcons,
  } = useSelector(transactionSubmissionSelector);
  const { tokenBalances } = useSelector(sorobanSelector);

  const {
    amount,
    asset,
    destinationAmount,
    destinationAsset,
    isToken,
  } = transactionData;

  const isSwap = useIsSwap();
  const { recommendedFee } = useNetworkFees();
  const [loadingRate, setLoadingRate] = useState(false);
  const [showBlockedDomainWarning, setShowBlockedDomainWarning] = useState(
    false,
  );
  const [suspiciousAssetData, setSuspiciousAssetData] = useState({
    domain: "",
    code: "",
    issuer: "",
    image: "",
  });

  const calculateAvailBalance = useCallback(
    (selectedAsset: string) => {
      let availBalance = new BigNumber("0");
      if (isToken) {
        const contractId = selectedAsset.split(":")[1];
        return getTokenBalance(tokenBalances, contractId);
      }
      if (accountBalances.balances) {
        // take base reserve into account for XLM payments
        const minBalance = new BigNumber(
          (2 + accountBalances.subentryCount) * BASE_RESERVE,
        );

        if (selectedAsset === "native") {
          // needed for different wallet-sdk bignumber.js version
          const currentBal = new BigNumber(
            accountBalances.balances[selectedAsset].total.toFixed(),
          );

          availBalance = currentBal
            .minus(minBalance)
            .minus(new BigNumber(Number(recommendedFee)));

          if (availBalance.lt(minBalance)) {
            return "0";
          }
        } else {
          // needed for different wallet-sdk bignumber.js version
          availBalance = new BigNumber(
            accountBalances.balances[selectedAsset].total,
          );
        }
      }

      return availBalance.toFixed().toString();
    },
    [
      accountBalances.balances,
      accountBalances.subentryCount,
      recommendedFee,
      isToken,
      tokenBalances,
    ],
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
    // check for scam asset
    if (blockedDomains.domains[assetDomains[values.asset]]) {
      setShowBlockedDomainWarning(true);
      setSuspiciousAssetData({
        code: getAssetFromCanonical(values.asset).code,
        issuer: getAssetFromCanonical(values.asset).issuer,
        domain: assetDomains[values.asset],
        image: assetIcons[values.asset],
      });
    } else if (blockedDomains.domains[assetDomains[values.destinationAsset]]) {
      setShowBlockedDomainWarning(true);
      setSuspiciousAssetData({
        code: getAssetFromCanonical(values.destinationAsset).code,
        issuer: getAssetFromCanonical(values.destinationAsset).issuer,
        domain: assetDomains[values.destinationAsset],
        image: assetIcons[values.destinationAsset],
      });
    } else {
      navigateTo(next);
    }
  };

  const validate = (values: { amount: string }) => {
    const val = cleanAmount(values.amount);
    if (new BigNumber(val).gt(new BigNumber(availBalance))) {
      return { amount: AMOUNT_ERROR.TOO_HIGH };
    }
    if (val.indexOf(".") !== -1 && val.split(".")[1].length > 7) {
      return { amount: AMOUNT_ERROR.DEC_MAX };
    }
    if (new BigNumber(val).gt(new BigNumber(TX_SEND_MAX))) {
      return { amount: AMOUNT_ERROR.SEND_MAX };
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
    if (!formik.values.destinationAsset || Number(formik.values.amount) === 0)
      return;
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
        <Notification
          variant="error"
          title={t("Entered amount is higher than your balance")}
        />
      );
    }
    if (formik.errors.amount === AMOUNT_ERROR.DEC_MAX) {
      return (
        <Notification
          variant="error"
          title={`7 ${t("digits after the decimal allowed")}`}
        />
      );
    }
    if (formik.errors.amount === AMOUNT_ERROR.SEND_MAX) {
      return (
        <Notification
          variant="error"
          title={`${t(
            "Entered amount is higher than the maximum send amount",
          )} (
          ${formatAmountPreserveCursor(
            TX_SEND_MAX,
            formik.values.amount,
            getAssetDecimals(asset, tokenBalances, isToken),
          )}
          )`}
        />
      );
    }
    return null;
  };

  return (
    <>
      {showBlockedDomainWarning && (
        <ScamAssetWarning
          isSendWarning
          domain={suspiciousAssetData.domain}
          code={suspiciousAssetData.code}
          issuer={suspiciousAssetData.issuer}
          image={suspiciousAssetData.image}
          onClose={() => setShowBlockedDomainWarning(false)}
          onContinue={() => navigateTo(next)}
        />
      )}
      <div
        className={`SendAmount ${isSwap ? "SendAmount__full-height" : ""}`}
        data-testid="send-amount-view"
      >
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
                <Icon.MoreHoriz />
              </button>
            )
          }
        />
        <div className="SendAmount__content">
          <div className="SendAmount__asset-copy">
            <span>{formatAmount(availBalance)}</span>{" "}
            <span>{parsedSourceAsset.code}</span> {t("available")}
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
            <SimpleBarWrapper
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
                  data-testid="send-amount-amount-input"
                  name="amount"
                  type="text"
                  placeholder="0"
                  value={formik.values.amount}
                  onChange={(e) => {
                    const input = e.target;
                    const {
                      amount: newAmount,
                      newCursor,
                    } = formatAmountPreserveCursor(
                      e.target.value,
                      formik.values.amount,
                      getAssetDecimals(asset, tokenBalances, isToken),
                      e.target.selectionStart || 1,
                    );
                    formik.setFieldValue("amount", newAmount);
                    runAfterUpdate(() => {
                      input.selectionStart = newCursor;
                      input.selectionEnd = newCursor;
                    });
                  }}
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
                            ? new BigNumber(destinationAmount).toFixed()
                            : "0"
                        }
                      />
                    </>
                  )}
                </div>
              </div>
            </SimpleBarWrapper>
            <div className="SendAmount__btn-continue">
              <Button
                size="md"
                disabled={
                  loadingRate ||
                  formik.values.amount === "0" ||
                  !formik.isValid ||
                  // path payment, but path not found
                  (showSourceAndDestAsset && !destinationAmount)
                }
                data-testid="send-amount-btn-continue"
                isFullWidth
                variant="tertiary"
                type="submit"
              >
                {t("Continue")}
              </Button>
            </div>
          </form>
        </div>
      </div>
      {isSwap && <BottomNav />}
      <LoadingBackground
        onClick={() => {}}
        isActive={showBlockedDomainWarning}
      />
    </>
  );
};
