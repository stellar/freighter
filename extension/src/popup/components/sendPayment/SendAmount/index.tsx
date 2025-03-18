import React, { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import debounce from "lodash/debounce";
import { BigNumber } from "bignumber.js";
import { useFormik } from "formik";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";
import { Asset } from "stellar-sdk";
import { useTranslation } from "react-i18next";

import {
  AssetSelect,
  PathPayAssetSelect,
} from "popup/components/sendPayment/SendAmount/AssetSelect";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { View } from "popup/basics/layout/View";
import { ROUTES } from "popup/constants/routes";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { useIsSwap, useIsSoroswapEnabled } from "popup/helpers/useIsSwap";
import { isAssetSuspicious } from "popup/helpers/blockaid";
import { emitMetric } from "helpers/metrics";
import { useRunAfterUpdate } from "popup/helpers/useRunAfterUpdate";
import {
  getAssetDecimals,
  getTokenBalance,
  isContractId,
} from "popup/helpers/soroban";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
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
  getBestSoroswapPath,
  getSoroswapTokens,
} from "popup/ducks/transactionSubmission";
import {
  AccountDoesntExistWarning,
  shouldAccountDoesntExistWarning,
} from "popup/components/sendPayment/SendTo";
import { Loading } from "popup/components/Loading";
import { ScamAssetWarning } from "popup/components/WarningMessages";
import { TX_SEND_MAX } from "popup/constants/transaction";
import { BASE_RESERVE } from "@shared/constants/stellar";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import { isSorobanBalance } from "popup/helpers/balance";

import { RequestState } from "constants/request";
import { findAssetBalance } from "helpers/hooks/useGetBalances";
import { useGetSendAmountData } from "./hooks/useSendAmountData";

import "../styles.scss";

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
    <div className="SendAmount__row__rate" data-testid="SendAmountRate">
      {loading ? (
        <div data-testid="SendAmountRateLoader">
          <Loader />
        </div>
      ) : (
        <>
          {destAmount ? (
            <span data-testid="SendAmountRateAmount">
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

  const publicKey = useSelector(publicKeySelector);
  const { transactionData, soroswapTokens } = useSelector(
    transactionSubmissionSelector,
  );
  const {
    amount,
    asset,
    destination,
    destinationAmount,
    destinationAsset,
    isToken,
    destinationIcon,
    isSoroswap,
  } = transactionData;
  const { state: sendAmountData, fetchData } = useGetSendAmountData(
    publicKey,
    networkDetails,
    {
      isMainnet: isMainnet(networkDetails),
      showHidden: false,
      includeIcons: true,
    },
    destination,
  );

  const isSwap = useIsSwap();
  const { recommendedFee } = useNetworkFees();
  const [loadingRate, setLoadingRate] = useState(false);
  const [showBlockedDomainWarning, setShowBlockedDomainWarning] =
    useState(false);
  const [suspiciousAssetData, setSuspiciousAssetData] = useState({
    domain: "",
    code: "",
    issuer: "",
    image: "",
    blockaidData: defaultBlockaidScanAssetResult,
  });
  const isLoading =
    sendAmountData.state === RequestState.IDLE ||
    sendAmountData.state === RequestState.LOADING;

  /* eslint-disable react-hooks/exhaustive-deps */
  const calculateAvailBalance = useCallback(
    (selectedAsset: string) => {
      if (isLoading) {
        return "";
      }

      let _availBalance = new BigNumber("0");
      const selectedCanonical = getAssetFromCanonical(selectedAsset);
      const selectedBalance = findAssetBalance(
        sendAmountData.data!.userBalances.balances,
        selectedCanonical,
      );
      if (isToken && selectedBalance && isSorobanBalance(selectedBalance)) {
        return getTokenBalance(selectedBalance);
      }
      if (sendAmountData.data?.userBalances!.balances) {
        // take base reserve into account for XLM payments
        const minBalance = new BigNumber(
          (2 + sendAmountData.data.userBalances.subentryCount) * BASE_RESERVE,
        );

        const balance = selectedBalance?.total || new BigNumber("0");
        if (selectedAsset === "native") {
          // needed for different wallet-sdk bignumber.js version
          const currentBal = new BigNumber(balance.toFixed());
          _availBalance = currentBal
            .minus(minBalance)
            .minus(new BigNumber(Number(recommendedFee)));

          if (_availBalance.lt(minBalance)) {
            return "0";
          }
        } else {
          // needed for different wallet-sdk bignumber.js version
          _availBalance = new BigNumber(balance);
        }
      }

      return _availBalance.toFixed().toString();
    },
    [sendAmountData.data?.userBalances, recommendedFee, isToken],
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
    // eslint-disable-next-line @typescript-eslint/naming-convention
    let isDestAssetScam = false;

    const destinationBalance = findAssetBalance(
      sendAmountData.data!.userBalances.balances,
      getAssetFromCanonical(destinationAsset),
    );
    if (values.destinationAsset) {
      dispatch(saveDestinationAsset(values.destinationAsset));
      isDestAssetScam =
        "blockaidData" in destinationBalance &&
        isAssetSuspicious(destinationBalance.blockaidData);
    }
    // check for scam asset
    const assetBalance = findAssetBalance(
      sendAmountData.data!.userBalances.balances,
      getAssetFromCanonical(asset),
    );
    const isSourceAssetScam =
      "blockaidData" in assetBalance &&
      isAssetSuspicious(assetBalance.blockaidData);
    if (isSourceAssetScam) {
      setShowBlockedDomainWarning(true);
      setSuspiciousAssetData({
        code: getAssetFromCanonical(values.asset).code,
        issuer: getAssetFromCanonical(values.asset).issuer,
        domain: sendAmountData.data!.domains.find(
          (domain) => domain.code === values.asset,
        )!.domain,
        image: sendAmountData.data!.icons[values.asset]!,
        blockaidData:
          assetBalance?.blockaidData || defaultBlockaidScanAssetResult,
      });
    } else if (isDestAssetScam) {
      setShowBlockedDomainWarning(true);
      setSuspiciousAssetData({
        code: getAssetFromCanonical(values.destinationAsset).code,
        issuer: getAssetFromCanonical(values.destinationAsset).issuer,
        domain: sendAmountData.data!.domains.find(
          (domain) => domain.code === values.destinationAsset,
        )!.domain,
        image: sendAmountData.data!.icons[values.destinationAsset]!,
        blockaidData:
          "blockaidData" in destinationBalance
            ? destinationBalance.blockaidData
            : defaultBlockaidScanAssetResult,
      });
    } else {
      navigateTo(next);
    }
  };

  const validate = (values: { amount: string }) => {
    if (!availBalance) {
      return {};
    }

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
      if (isSoroswap) {
        const getContract = (formAsset: string) =>
          formAsset === "native"
            ? getNativeContractDetails(networkDetails).contract
            : formAsset.split(":")[1];

        await dispatch(
          getBestSoroswapPath({
            amount: formikAm,
            sourceContract: getContract(formik.values.asset),
            destContract: getContract(formik.values.destinationAsset),
            networkDetails,
            publicKey,
          }),
        );
      } else {
        await dispatch(
          getBestPath({
            amount: formikAm,
            sourceAsset,
            destAsset,
            networkDetails,
          }),
        );
      }

      setLoadingRate(false);
    }, 2000),
    [],
  );

  useEffect(() => {
    setAvailBalance(calculateAvailBalance(formik.values.asset));
  }, [calculateAvailBalance, formik.values.asset]);

  // on asset select get conversion rate
  useEffect(() => {
    if (!formik.values.destinationAsset || Number(formik.values.amount) === 0) {
      return;
    }
    setLoadingRate(true);
    // clear dest amount before re-calculating for UI
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
  // also, need to check if both source and destination are native
  useEffect(() => {
    if (
      isSwap &&
      (!destinationAsset ||
        (destinationAsset === "native" && asset === "native"))
    ) {
      let defaultDestAsset;

      // if pre-chosen source asset (eg. from AssetDetails) not XLM, default dest asset to XLM
      if (formik.values.asset !== Asset.native().toString()) {
        defaultDestAsset = Asset.native().toString();
      } else {
        // otherwise default to first non-native/classic side asset if exists
        const nonXlmAssets = sendAmountData.data?.userBalances!.balances.filter(
          (b) =>
            !("token" in b && b.token.code === "native") &&
            !("liquidityPoolId" in b) &&
            !("decimals" in b),
        );
        defaultDestAsset =
          nonXlmAssets && nonXlmAssets[0]
            ? nonXlmAssets[0]
            : Asset.native().toString();
      }

      dispatch(saveDestinationAsset(defaultDestAsset));
    }
  }, [
    isSwap,
    dispatch,
    destinationAsset,
    sendAmountData.data?.userBalances,
    formik.values.asset,
    asset,
  ]);

  useEffect(() => {
    if (!soroswapTokens.length) {
      dispatch(getSoroswapTokens());
    }
  }, [isSwap, useIsSoroswapEnabled]);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      !isContractId(destination) &&
      !isSwap &&
      shouldAccountDoesntExistWarning(
        isSwap ? false : sendAmountData.data!.destinationBalances.isFunded!,
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
            getAssetDecimals(asset, sendAmountData.data!.userBalances, isToken),
          )}
          )`}
        />
      );
    }
    return null;
  };

  if (isLoading) {
    return <Loading />;
  }

  const sourceBalance = findAssetBalance(
    sendAmountData.data!.userBalances.balances,
    parsedSourceAsset,
  );
  const destBalance = findAssetBalance(
    sendAmountData.data!.userBalances.balances,
    getAssetFromCanonical(formik.values.destinationAsset),
  );

  return (
    <>
      {showBlockedDomainWarning && (
        <ScamAssetWarning
          isSendWarning
          pillType="Transaction"
          balances={sendAmountData.data!.userBalances}
          assetIcons={sendAmountData.data!.icons}
          domain={suspiciousAssetData.domain}
          code={suspiciousAssetData.code}
          issuer={suspiciousAssetData.issuer}
          image={suspiciousAssetData.image}
          onClose={() => setShowBlockedDomainWarning(false)}
          onContinue={() => navigateTo(next)}
          blockaidData={suspiciousAssetData.blockaidData}
        />
      )}
      <React.Fragment>
        <SubviewHeader
          title={
            <span>
              {isSwap ? "Swap" : "Send"} {parsedSourceAsset.code}{" "}
              {isSoroswap ? (
                <span>
                  on{" "}
                  <a
                    href="https://soroswap.finance/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Soroswap
                  </a>
                </span>
              ) : null}
            </span>
          }
          subtitle={
            <div className="SendAmount__subtitle">
              <span>{formatAmount(availBalance)}</span>{" "}
              <span>{parsedSourceAsset.code}</span> {t("available")}
            </div>
          }
          hasBackButton={!isSwap}
          customBackAction={() => navigateTo(previous)}
          rightButton={
            isSwap ? null : (
              <button
                onClick={() => navigateTo(ROUTES.sendPaymentType)}
                className="SendAmount__icon-slider"
              >
                <Icon.Expand01 />
              </button>
            )
          }
        />
        <View.Content
          contentFooter={
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
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  formik.submitForm();
                }}
              >
                {t("Continue")}
              </Button>
            </div>
          }
        >
          <div className="SendAmount">
            <div className="SendAmount__content">
              <div className="SendAmount__btn-set-max">
                <Button
                  size="md"
                  variant="tertiary"
                  onClick={() => {
                    emitMetric(METRIC_NAMES.sendPaymentSetMax);
                    formik.setFieldValue(
                      "amount",
                      calculateAvailBalance(formik.values.asset),
                    );
                  }}
                  data-testid="SendAmountSetMax"
                >
                  {t("SET MAX")}
                </Button>
              </div>

              <form>
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
                      const { amount: newAmount, newCursor } =
                        formatAmountPreserveCursor(
                          e.target.value,
                          formik.values.amount,
                          getAssetDecimals(
                            asset,
                            sendAmountData.data!.userBalances,
                            isToken,
                          ),
                          e.target.selectionStart || 1,
                        );
                      formik.setFieldValue("amount", newAmount);
                      dispatch(saveAmount(newAmount));
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
                      sourceAmount={
                        cleanAmount(formik.values.amount) || defaultSourceAmount
                      }
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
                        icons={sendAmountData.data?.icons || {}}
                        isSuspicious={
                          "blockaidData" in sourceBalance &&
                          isAssetSuspicious(sourceBalance.blockaidData)
                        }
                      />
                    )}
                    {showSourceAndDestAsset && (
                      <>
                        <PathPayAssetSelect
                          source={true}
                          assetCode={parsedSourceAsset.code}
                          issuerKey={parsedSourceAsset.issuer}
                          balance={formik.values.amount}
                          icon=""
                          icons={sendAmountData.data?.icons || {}}
                          isSuspicious={
                            "blockaidData" in sourceBalance &&
                            isAssetSuspicious(sourceBalance.blockaidData)
                          }
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
                          icon={destinationIcon}
                          icons={sendAmountData.data!.icons}
                          isSuspicious={
                            "blockaidData" in destBalance &&
                            isAssetSuspicious(destBalance.blockaidData)
                          }
                        />
                      </>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </View.Content>
      </React.Fragment>
      <LoadingBackground
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        onClick={() => {}}
        isActive={showBlockedDomainWarning}
      />
    </>
  );
};
