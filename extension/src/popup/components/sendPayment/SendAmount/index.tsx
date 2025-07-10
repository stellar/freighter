import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import { Navigate, useLocation } from "react-router-dom";
import debounce from "lodash/debounce";
import BigNumber from "bignumber.js";
import { useFormik } from "formik";
import {
  Button,
  Icon,
  Loader,
  Logo,
  Notification,
} from "@stellar/design-system";
import { Asset } from "stellar-sdk";
import { useTranslation } from "react-i18next";

import {
  AssetSelect,
  PathPayAssetSelect,
} from "popup/components/sendPayment/SendAmount/AssetSelect";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { View } from "popup/basics/layout/View";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isMainnet,
  truncatedPublicKey,
} from "helpers/stellar";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { useIsSwap, useIsSoroswapEnabled } from "popup/helpers/useIsSwap";
import { isAssetSuspicious } from "popup/helpers/blockaid";
import { emitMetric } from "helpers/metrics";
import { useRunAfterUpdate } from "popup/helpers/useRunAfterUpdate";
import {
  getAssetDecimals,
  getAvailableBalance,
  getTokenBalance,
  isContractId,
} from "popup/helpers/soroban";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import { SubviewHeader } from "popup/components/SubviewHeader";
import {
  cleanAmount,
  formatAmount,
  formatAmountPreserveCursor,
  roundUsdValue,
} from "popup/helpers/formatters";
import {
  transactionSubmissionSelector,
  saveAmount,
  saveAsset,
  saveDestinationAsset,
  getBestPath,
  getBestSoroswapPath,
  getSoroswapTokens,
  saveMemo,
  saveTransactionFee,
  saveTransactionTimeout,
  saveAmountUsd,
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
import { isSorobanBalance, findAssetBalance } from "popup/helpers/balance";
import {
  AssetType,
  ClassicAsset,
  LiquidityPoolShareAsset,
} from "@shared/api/types/account-balance";

import { RequestState, State } from "constants/request";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { EditSettings } from "popup/components/InternalTransaction/EditSettings";
import { EditMemo } from "popup/components/InternalTransaction/EditMemo";
import { ReviewTx } from "popup/components/InternalTransaction/ReviewTransaction";

import { AppDataType } from "helpers/hooks/useGetAppData";
import { useGetSendAmountData } from "./hooks/useSendAmountData";
import { SimulateTxData } from "./hooks/useSimulateTxData";

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

const CHAR_WIDTH = 24;

export const SendAmount = ({
  goBack,
  goToNext,
  goToPaymentType,
  goToChooseAsset,
}: {
  goBack: () => void;
  goToNext: () => void;
  goToChooseAsset: () => void;
  goToPaymentType?: () => void;
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const runAfterUpdate = useRunAfterUpdate();
  const spanRef = useRef<HTMLSpanElement>(null);
  const [inputWidth, setInputWidth] = useState(CHAR_WIDTH);

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
    {
      showHidden: false,
      includeIcons: true,
    },
    destination,
  );
  const isLoading =
    sendAmountData.state === RequestState.IDLE ||
    sendAmountData.state === RequestState.LOADING;

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

  /* eslint-disable react-hooks/exhaustive-deps */
  const calculateAvailBalance = useCallback(
    (selectedAsset: string) => {
      if (isLoading || sendAmountData.data?.type === AppDataType.REROUTE) {
        return "";
      }
      const userBalances = sendAmountData.data?.userBalances!;

      let _availBalance = new BigNumber("0");
      const selectedCanonical = getAssetFromCanonical(selectedAsset);
      const selectedBalance = findAssetBalance(
        userBalances?.balances,
        selectedCanonical,
      );
      if (isToken && selectedBalance && isSorobanBalance(selectedBalance)) {
        return getTokenBalance(selectedBalance);
      }
      if (userBalances) {
        // take base reserve into account for XLM payments
        const minBalance = new BigNumber(
          (2 + userBalances.subentryCount) * BASE_RESERVE,
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
    [sendAmountData.data, recommendedFee, isToken],
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

    let isDestAssetScam = false;

    if (sendAmountData.data?.type === AppDataType.REROUTE) {
      return;
    }
    const userBalances = sendAmountData.data?.userBalances!;
    const domains = sendAmountData.data?.domains!;
    const icons = sendAmountData.data?.icons!;

    const destinationBalance = findAssetBalance(
      userBalances.balances,
      getAssetFromCanonical(destinationAsset || "native"),
    );
    if (values.destinationAsset) {
      dispatch(saveDestinationAsset(values.destinationAsset));
      isDestAssetScam =
        !!destinationBalance &&
        "blockaidData" in destinationBalance &&
        isAssetSuspicious(destinationBalance.blockaidData);
    }
    // check for scam asset
    const assetBalance = findAssetBalance(
      userBalances.balances,
      getAssetFromCanonical(asset),
    );
    const isSourceAssetScam =
      !!assetBalance &&
      "blockaidData" in assetBalance &&
      isAssetSuspicious(assetBalance.blockaidData);
    if (isSourceAssetScam) {
      setShowBlockedDomainWarning(true);
      setSuspiciousAssetData({
        code: getAssetFromCanonical(values.asset).code,
        issuer: getAssetFromCanonical(values.asset).issuer,
        domain: domains.find(
          (domain) =>
            getCanonicalFromAsset(domain.code!, domain.issuer) === values.asset,
        )!.domain,
        image: icons[values.asset]!,
        blockaidData:
          assetBalance?.blockaidData || defaultBlockaidScanAssetResult,
      });
    } else if (isDestAssetScam) {
      setShowBlockedDomainWarning(true);
      setSuspiciousAssetData({
        code: getAssetFromCanonical(values.destinationAsset).code,
        issuer: getAssetFromCanonical(values.destinationAsset).issuer,
        domain: domains.find(
          (domain) =>
            getCanonicalFromAsset(domain.code!, domain.issuer) ===
            values.destinationAsset,
        )!.domain,
        image: icons[values.destinationAsset]!,
        blockaidData:
          !!destinationBalance && "blockaidData" in destinationBalance
            ? destinationBalance.blockaidData
            : defaultBlockaidScanAssetResult,
      });
    } else {
      goToNext();
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

  useEffect(() => {
    if (spanRef.current) {
      // Use scrollWidth to get actual rendered width
      setInputWidth(spanRef.current.scrollWidth + 2); // Add small padding buffer
    }
  }, [formik.values.amount]);

  const showSourceAndDestAsset = !!formik.values.destinationAsset;
  const parsedSourceAsset = getAssetFromCanonical(formik.values.asset);
  const parsedDestAsset = getAssetFromCanonical(
    formik.values.destinationAsset || "native",
  );

  useEffect(() => {
    setAvailBalance(calculateAvailBalance(formik.values.asset));
  }, [calculateAvailBalance, formik.values.asset, sendAmountData.state]);

  // for swaps we're loading and choosing the default destinationAsset here
  // also, need to check if both source and destination are native
  useEffect(() => {
    if (
      sendAmountData.data?.type === "resolved" &&
      isSwap &&
      (!destinationAsset ||
        (destinationAsset === "native" && asset === "native"))
    ) {
      let defaultDestAsset;
      const userBalances = sendAmountData.data.userBalances;

      // if pre-chosen source asset (eg. from AssetDetails) not XLM, default dest asset to XLM
      if (formik.values.asset !== Asset.native().toString()) {
        defaultDestAsset = Asset.native().toString();
      } else {
        // otherwise default to first classic side asset if exists
        const nonXlmAssets = userBalances.balances.filter(
          (b) =>
            !("token" in b && b.token.code === "XLM") &&
            !("liquidityPoolId" in b) &&
            !("decimals" in b),
        ) as Exclude<AssetType, LiquidityPoolShareAsset>[];
        defaultDestAsset =
          nonXlmAssets && nonXlmAssets[0]
            ? getCanonicalFromAsset(
                nonXlmAssets[0].token.code,
                // casting here since this will be classic or native asset
                (nonXlmAssets[0] as ClassicAsset).token.issuer?.key,
              )
            : Asset.native().toString();
      }

      dispatch(saveDestinationAsset(defaultDestAsset));
    }
  }, [
    isSwap,
    dispatch,
    destinationAsset,
    sendAmountData.data,
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

  const db = useCallback(
    debounce(
      async (formikAm, sourceAsset, destAsset, publicKey, networkDetails) => {
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
      },
      2000,
    ),
    [],
  );

  // on asset select get conversion rate
  useEffect(() => {
    if (
      !formik.values.destinationAsset ||
      Number(formik.values.amount) === 0 ||
      sendAmountData.state !== RequestState.SUCCESS ||
      sendAmountData.data.type !== AppDataType.RESOLVED
    ) {
      return;
    }
    setLoadingRate(true);
    // clear dest amount before re-calculating for UI
    db(
      formik.values.amount || defaultSourceAmount,
      formik.values.asset,
      formik.values.destinationAsset,
      sendAmountData.data.publicKey,
      sendAmountData.data.networkDetails,
    );
  }, [
    db,
    formik.values.asset,
    formik.values.destinationAsset,
    formik.values.amount,
    dispatch,
    sendAmountData.state,
  ]);

  if (isLoading) {
    return <Loading />;
  }

  const hasError = sendAmountData.state === RequestState.ERROR;
  if (sendAmountData.data?.type === AppDataType.REROUTE) {
    if (sendAmountData.data.shouldOpenTab) {
      openTab(newTabHref(sendAmountData.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${sendAmountData.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: sendAmountData.data.type,
      applicationState: sendAmountData.data.applicationState,
      state: sendAmountData.state,
    });
  }

  const sourceBalance = findAssetBalance(
    sendAmountData.data!.userBalances.balances,
    parsedSourceAsset,
  );
  const destBalance = findAssetBalance(
    sendAmountData.data!.userBalances.balances,
    getAssetFromCanonical(formik.values.destinationAsset || "native"),
  );
  const sendData = sendAmountData.data!;

  const DecideWarning = () => {
    // unfunded destination
    if (
      !isContractId(destination) &&
      !isSwap &&
      shouldAccountDoesntExistWarning(
        isSwap ? false : sendData.destinationBalances.isFunded!,
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
            getAssetDecimals(asset, sendData.userBalances, isToken),
          )}
          )`}
        />
      );
    }
    return null;
  };

  return (
    <>
      {showBlockedDomainWarning &&
        createPortal(
          <ScamAssetWarning
            isSendWarning
            pillType="Transaction"
            balances={sendData.userBalances}
            assetIcons={sendAmountData.data?.icons || {}}
            domain={suspiciousAssetData.domain}
            code={suspiciousAssetData.code}
            issuer={suspiciousAssetData.issuer}
            image={suspiciousAssetData.image}
            onClose={() => setShowBlockedDomainWarning(false)}
            onContinue={goToNext}
            blockaidData={suspiciousAssetData.blockaidData}
          />,
          document.querySelector("#modal-root")!,
        )}
      <React.Fragment>
        <SubviewHeader
          title={
            <span>
              {isSwap ? "Swap" : "Send"}
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
          hasBackButton
          customBackAction={() => {
            // NOTE: resets base state for transaction data
            dispatch(saveAsset("native"));
            dispatch(saveAmount("0"));
            goBack();
          }}
          rightButton={
            isSwap ? null : (
              <button
                onClick={goToPaymentType}
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
                  loadingRate || formik.values.amount === "0" || !formik.isValid
                }
                data-testid="send-amount-btn-continue"
                isFullWidth
                variant="secondary"
                onClick={(e) => {
                  e.preventDefault();
                  formik.submitForm();
                }}
              >
                {t("Review Send")}
              </Button>
            </div>
          }
        >
          <div className="SendAmount">
            <div className="SendAmount__content">
              <form>
                <div className="SendAmount__simplebar__content">
                  <div className="SendAmount__amount-row">
                    <div className="SendAmount__amount-input-container">
                      <span
                        ref={spanRef}
                        className={`SendAmount__mirror-amount SendAmount__${getAmountFontSize()}`}
                      >
                        {formik.values.amount}
                      </span>
                      <input
                        className={`SendAmount__input-amount ${
                          isSwap ? "SendAmount__input-amount__full-height" : ""
                        } SendAmount__${getAmountFontSize()}`}
                        style={{
                          width: inputWidth,
                        }}
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
                                sendData.userBalances,
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
                      <div
                        className={`SendAmount__amount-label SendAmount__${getAmountFontSize()}`}
                      >
                        {parsedSourceAsset.code}
                      </div>
                    </div>
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
                  <div className="SendAmount__btn-set-max">
                    <Button
                      size="md"
                      variant="tertiary"
                      isRounded
                      onClick={() => {
                        emitMetric(METRIC_NAMES.sendPaymentSetMax);
                        formik.setFieldValue(
                          "amount",
                          calculateAvailBalance(formik.values.asset),
                        );
                      }}
                      data-testid="SendAmountSetMax"
                    >
                      {t("Set Max")}
                    </Button>
                  </div>
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
                          !!sourceBalance &&
                          "blockaidData" in sourceBalance &&
                          isAssetSuspicious(sourceBalance.blockaidData)
                        }
                        onSelectAsset={() => {
                          dispatch(saveAmount("0"));
                          goToChooseAsset();
                        }}
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
                            !!sourceBalance &&
                            "blockaidData" in sourceBalance &&
                            isAssetSuspicious(sourceBalance.blockaidData)
                          }
                          onSelectAsset={() => {
                            dispatch(saveAmount("0"));
                            goToChooseAsset();
                          }}
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
                            !!destBalance &&
                            "blockaidData" in destBalance &&
                            isAssetSuspicious(destBalance.blockaidData)
                          }
                          onSelectAsset={() => {
                            dispatch(saveAmount("0"));
                            goToChooseAsset();
                          }}
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
        onClick={() => {}}
        isActive={showBlockedDomainWarning}
      />
    </>
  );
};

type InputType = "crypto" | "fiat";

export const SendAmount2 = ({
  goBack,
  goToNext,
  goToChooseDest,
  simulationState,
  fetchSimulationData,
}: {
  goBack: () => void;
  goToNext: () => void;
  goToChooseDest: () => void;
  simulationState: State<SimulateTxData, unknown>;
  fetchSimulationData: () => Promise<unknown>;
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const runAfterUpdate = useRunAfterUpdate();
  const { transactionData } = useSelector(transactionSubmissionSelector);
  const { amount, amountUsd, asset, destination, destinationAsset, isToken } =
    transactionData;
  const { networkCongestion, recommendedFee } = useNetworkFees();

  const { state: sendAmountData, fetchData } = useGetSendAmountData(
    {
      showHidden: false,
      includeIcons: true,
    },
    destination,
  );

  const spanRef = useRef<HTMLSpanElement>(null);
  const spanRefUsd = useRef<HTMLSpanElement>(null);
  const cryptoInputRef = useRef<HTMLInputElement>(null);
  const usdInputRef = useRef<HTMLInputElement>(null);

  const [inputWidth, setInputWidth] = useState(CHAR_WIDTH);
  const [inputWidthUsd, setInputWidthUsd] = useState(CHAR_WIDTH);
  const [inputType, setInputType] = useState<InputType>("crypto");
  const [isEditingMemo, setIsEditingMemo] = React.useState(false);
  const [isEditingSettings, setIsEditingSettings] = React.useState(false);
  const [isReviewingTx, setIsReviewingTx] = React.useState(false);

  const handleContinue = async () => {
    await fetchSimulationData();
    setIsReviewingTx(true);
  };

  const validate = (values: { amount: string }) => {
    const amount = inputType === "crypto" ? values.amount : priceValue!;
    const val = cleanAmount(amount);

    if (val.indexOf(".") !== -1 && val.split(".")[1].length > 7) {
      return { amount: AMOUNT_ERROR.DEC_MAX };
    }
    if (new BigNumber(val).gt(new BigNumber(TX_SEND_MAX))) {
      return { amount: AMOUNT_ERROR.SEND_MAX };
    }
    return {};
  };

  const formik = useFormik({
    initialValues: { amount, amountUsd: amountUsd, asset, destinationAsset },
    onSubmit: handleContinue,
    validate,
    enableReinitialize: true,
    validateOnChange: true,
  });

  const srcAsset = getAssetFromCanonical(asset);
  const parsedSourceAsset = getAssetFromCanonical(formik.values.asset);
  const isLoading =
    sendAmountData.state === RequestState.IDLE ||
    sendAmountData.state === RequestState.LOADING;

  useEffect(() => {
    if (spanRef.current) {
      setInputWidth(spanRef.current.scrollWidth + 8);
    }
  }, [formik.values.amount, amount, amountUsd]);

  useEffect(() => {
    if (spanRefUsd.current) {
      setInputWidthUsd(spanRefUsd.current.scrollWidth + 8);
    }
  }, [formik.values.amountUsd, amount, amountUsd]);

  useEffect(() => {
    if (cryptoInputRef.current) {
      cryptoInputRef.current.focus();
      cryptoInputRef.current.select();
    }

    if (usdInputRef.current) {
      usdInputRef.current.focus();
      usdInputRef.current.select();
    }
  }, []);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
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

  if (isLoading) {
    return <Loading />;
  }

  const hasError = sendAmountData.state === RequestState.ERROR;
  if (sendAmountData.data?.type === AppDataType.REROUTE) {
    if (sendAmountData.data.shouldOpenTab) {
      openTab(newTabHref(sendAmountData.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${sendAmountData.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: sendAmountData.data.type,
      applicationState: sendAmountData.data.applicationState,
      state: sendAmountData.state,
    });
  }

  const sendData = sendAmountData.data!;
  const assetIcon = sendData.icons[asset];
  const assetBalance = findAssetBalance(
    sendData.userBalances.balances,
    srcAsset,
  )!;
  const prices = sendData.tokenPrices;
  const assetPrice = prices[asset] && prices[asset].currentPrice;
  const xlmPrice = prices["native"]?.currentPrice;
  const assetDecimals = getAssetDecimals(asset, sendData.userBalances, isToken);
  const priceValue = assetPrice
    ? new BigNumber(cleanAmount(formik.values.amountUsd))
        .dividedBy(new BigNumber(assetPrice))
        .decimalPlaces(assetDecimals)
        .toString()
    : null;
  const priceValueUsd = assetPrice
    ? `${formatAmount(
        roundUsdValue(
          new BigNumber(assetPrice)
            .multipliedBy(new BigNumber(cleanAmount(formik.values.amount)))
            .toString(),
        ),
      )}`
    : null;
  const recommendedFeeUsd = xlmPrice
    ? `$ ${formatAmount(
        roundUsdValue(
          new BigNumber(xlmPrice)
            .multipliedBy(new BigNumber(recommendedFee))
            .toString(),
        ),
      )}`
    : null;
  const supportsUsd =
    isMainnet(sendAmountData.data?.networkDetails!) && assetPrice;
  const displayTotal = `${formatAmount(assetBalance.total.toString())} ${srcAsset.code}`;
  const availableBalance = getAvailableBalance({
    assetCanonical: asset,
    balances: sendData.userBalances.balances,
    recommendedFee,
    subentryCount: sendData.userBalances.subentryCount,
  });
  const srcTitle = asset === "native" ? "Stellar Lumens" : srcAsset.code;
  const goBackAction = () => {
    dispatch(saveAsset("native"));
    dispatch(saveAmount("0"));
    dispatch(saveAmountUsd("0.00"));
    goBack();
  };
  const onConfirmSend = async () => {
    const amount = inputType === "crypto" ? formik.values.amount : priceValue!;
    dispatch(saveAmount(cleanAmount(amount)));
    goToNext();
  };

  return (
    <React.Fragment>
      <SubviewHeader
        title={<span>Send</span>}
        hasBackButton
        customBackAction={goBackAction}
      />
      <View.Content
        contentFooter={
          <div className="SendAmount__btn-continue">
            <div className="SendAmount__settings-row">
              <div className="SendAmount__settings-fee-display">
                <span className="SendAmount__settings-fee-display__label">
                  Fee:
                </span>
                {inputType === "crypto" && <Logo.StellarShort />}
                <span>
                  {inputType === "crypto"
                    ? `${recommendedFee} XLM`
                    : recommendedFeeUsd}
                </span>
              </div>
              <div className="SendAmount__settings-options">
                <Button
                  size="sm"
                  isRounded
                  variant="tertiary"
                  onClick={() => setIsEditingMemo(true)}
                >
                  {t("Add a memo")}
                </Button>
                <Button
                  size="sm"
                  isRounded
                  variant="tertiary"
                  onClick={() => setIsEditingSettings(true)}
                >
                  <Icon.Settings01 />
                </Button>
              </div>
            </div>
            <Button
              size="md"
              disabled={
                (inputType === "crypto" &&
                  new BigNumber(formik.values.amount).isZero()) ||
                (inputType === "fiat" &&
                  new BigNumber(formik.values.amountUsd).isZero()) ||
                (inputType === "crypto" &&
                  new BigNumber(cleanAmount(formik.values.amount)).gt(
                    new BigNumber(availableBalance),
                  )) ||
                (inputType === "fiat" &&
                  new BigNumber(cleanAmount(priceValue!)).gt(
                    new BigNumber(availableBalance),
                  ))
              }
              isLoading={simulationState.state === RequestState.LOADING}
              data-testid="send-amount-btn-continue"
              isFullWidth
              isRounded
              variant="secondary"
              onClick={(e) => {
                e.preventDefault();
                formik.submitForm();
              }}
            >
              {t("Review Send")}
            </Button>
          </div>
        }
      >
        <div className="SendAmount">
          <div className="SendAmount__content">
            <form>
              <div className="SendAmount__simplebar__content">
                <div className="SendAmount__amount-row">
                  <div className="SendAmount__amount-input-container">
                    {inputType === "crypto" && (
                      <>
                        <span
                          ref={spanRef}
                          className={`SendAmount__mirror-amount SendAmount__${getAmountFontSize()}`}
                        >
                          {formik.values.amount}
                        </span>
                        <input
                          ref={cryptoInputRef}
                          className={`SendAmount__input-amount SendAmount__${getAmountFontSize()}`}
                          style={{
                            width: inputWidth,
                          }}
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
                                  sendData.userBalances,
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
                        <div
                          className={`SendAmount__amount-label SendAmount__${getAmountFontSize()}`}
                        >
                          {parsedSourceAsset.code}
                        </div>
                      </>
                    )}
                    {inputType === "fiat" && (
                      <>
                        <span
                          ref={spanRefUsd}
                          className={`SendAmount__mirror-amount SendAmount__${getAmountFontSize()}`}
                        >
                          {formik.values.amountUsd}
                        </span>
                        <div
                          className={`SendAmount__amount-label-usd SendAmount__${getAmountFontSize()}`}
                        >
                          $
                        </div>
                        <input
                          ref={usdInputRef}
                          className={`SendAmount__input-amount SendAmount__${getAmountFontSize()}`}
                          style={{
                            width: inputWidthUsd,
                          }}
                          data-testid="send-amount-amount-input"
                          name="amountUsd"
                          type="text"
                          value={formik.values.amountUsd}
                          onChange={(e) => {
                            const input = e.target;
                            const { amount: newAmount, newCursor } =
                              formatAmountPreserveCursor(
                                e.target.value,
                                formik.values.amountUsd,
                                2,
                                e.target.selectionStart || 1,
                              );
                            formik.setFieldValue("amountUsd", newAmount);
                            dispatch(saveAmountUsd(newAmount));
                            runAfterUpdate(() => {
                              input.selectionStart = newCursor;
                              input.selectionEnd = newCursor;
                            });
                          }}
                          autoFocus
                          autoComplete="off"
                        />
                      </>
                    )}
                  </div>
                </div>
                {supportsUsd && (
                  <div className="SendAmount__amount-price">
                    {inputType === "crypto"
                      ? `$ ${priceValueUsd}`
                      : `${priceValue} ${parsedSourceAsset.code}`}
                    <Button
                      size="md"
                      type="button"
                      isRounded
                      variant="tertiary"
                      onClick={(e) => {
                        e.preventDefault();
                        const newInputType =
                          inputType === "crypto" ? "fiat" : "crypto";
                        if (newInputType === "crypto") {
                          dispatch(saveAmount(priceValue));
                          formik.setFieldValue("amount", priceValue);
                        }
                        if (newInputType === "fiat") {
                          dispatch(saveAmountUsd(priceValueUsd));
                          formik.setFieldValue("amountUsd", priceValueUsd);
                        }
                        setInputType(newInputType);
                      }}
                    >
                      <Icon.RefreshCw03 />
                    </Button>
                  </div>
                )}
                <div className="SendAmount__btn-set-max">
                  <Button
                    size="md"
                    type="button"
                    variant="tertiary"
                    isRounded
                    onClick={(e) => {
                      e.preventDefault();
                      emitMetric(METRIC_NAMES.sendPaymentSetMax);
                      if (inputType === "fiat") {
                        const availableUsd = formatAmount(
                          roundUsdValue(
                            new BigNumber(assetPrice!)
                              .multipliedBy(
                                new BigNumber(cleanAmount(availableBalance)),
                              )
                              .toString(),
                          ),
                        );
                        formik.setFieldValue("amountUsd", availableUsd);
                        dispatch(saveAmountUsd(availableUsd));
                      } else {
                        formik.setFieldValue("amount", availableBalance);
                        dispatch(saveAmount(availableBalance));
                      }
                    }}
                    data-testid="SendAmountSetMax"
                  >
                    {t("Set Max")}
                  </Button>
                </div>
                <div className="SendAmount__EditDestAsset">
                  <div className="SendAmount__EditDestAsset__title">
                    <AssetIcon
                      assetIcons={
                        asset !== "native" ? { [asset]: assetIcon } : {}
                      }
                      code={srcAsset.code}
                      issuerKey={srcAsset.issuer}
                      icon={assetIcon}
                      isSuspicious={false}
                    />
                    <div className="SendAmount__EditDestAsset__asset-title">
                      <div className="SendAmount__EditDestAsset__asset-heading">
                        {srcTitle}
                      </div>
                      <div className="SendAmount__EditDestAsset__asset-total">
                        {displayTotal}
                      </div>
                    </div>
                  </div>
                  <Button
                    isRounded
                    size="sm"
                    variant="tertiary"
                    onClick={goBackAction}
                  >
                    Edit
                  </Button>
                </div>
                <div className="SendAmount__EditDestination">
                  <div className="SendAmount__EditDestination__title">
                    <div className="SendAmount__EditDestination__identicon">
                      <IdenticonImg publicKey={destination} />
                    </div>
                    {truncatedPublicKey(destination)}
                  </div>
                  <Button
                    isRounded
                    size="sm"
                    variant="tertiary"
                    onClick={() => {
                      dispatch(saveAsset("native"));
                      dispatch(saveAmount("0"));
                      dispatch(saveAmountUsd("0.00"));
                      goToChooseDest();
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </View.Content>
      {isEditingMemo ? (
        <>
          <div className="EditMemoWrapper">
            <EditMemo
              memo={transactionData.memo || ""}
              onClose={() => setIsEditingMemo(false)}
              onSubmit={({ memo }: { memo: string }) => {
                dispatch(saveMemo(memo));
                setIsEditingMemo(false);
              }}
            />
          </div>
          <LoadingBackground
            onClick={() => setIsEditingMemo(false)}
            isActive={isEditingMemo}
          />
        </>
      ) : null}
      {isEditingSettings ? (
        <>
          <div className="EditMemoWrapper">
            <EditSettings
              fee={recommendedFee}
              timeout={transactionData.transactionTimeout}
              congestion={networkCongestion}
              onClose={() => setIsEditingSettings(false)}
              onSubmit={({
                fee,
                timeout,
              }: {
                fee: string;
                timeout: number;
              }) => {
                dispatch(saveTransactionFee(fee));
                dispatch(saveTransactionTimeout(timeout));
                setIsEditingSettings(false);
              }}
            />
          </div>
          <LoadingBackground
            onClick={() => setIsEditingSettings(false)}
            isActive={isEditingSettings}
          />
        </>
      ) : null}
      {isReviewingTx ? (
        <>
          <div className="ReviewTxWrapper">
            <ReviewTx
              assetIcon={assetIcon}
              fee={recommendedFee}
              networkDetails={sendAmountData.data?.networkDetails!}
              onCancel={() => setIsReviewingTx(false)}
              onConfirm={onConfirmSend}
              sendAmount={amount}
              sendPriceUsd={inputType === "crypto" ? priceValue! : amountUsd}
              simulationState={simulationState}
              srcAsset={asset}
              title="You are sending"
            />
          </div>
          <LoadingBackground
            onClick={() => setIsReviewingTx(false)}
            isActive={isReviewingTx}
          />
        </>
      ) : null}
    </React.Fragment>
  );
};
