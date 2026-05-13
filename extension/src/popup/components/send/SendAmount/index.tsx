import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import BigNumber from "bignumber.js";
import { useFormik } from "formik";
import { Button, Icon, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { LoadingBackground } from "popup/basics/LoadingBackground";
import { View } from "popup/basics/layout/View";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import { getAssetFromCanonical, isMuxedAccount } from "helpers/stellar";
import { NetworkCongestion } from "popup/helpers/useNetworkFees";
import { emitMetric } from "helpers/metrics";
import { trackSendFeeBreakdownOpened } from "popup/metrics/send";
import { useRunAfterUpdate } from "popup/helpers/useRunAfterUpdate";
import {
  getAssetDecimals,
  getAvailableBalance,
  getContractIdFromTransactionData,
} from "popup/helpers/soroban";
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
  saveIsToken,
  saveMemo,
  saveTransactionFee,
  saveManualTransactionFee,
  saveTransactionTimeout,
  saveAmountUsd,
} from "popup/ducks/transactionSubmission";
import { Loading } from "popup/components/Loading";
import { TX_SEND_MAX } from "popup/constants/transaction";
import { getBalanceByAsset, getBalanceByKey } from "popup/helpers/balance";

import { RequestState, State } from "constants/request";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { AMOUNT_ERROR, InputType } from "helpers/transaction";
import { reRouteOnboarding } from "popup/helpers/route";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { EditSettings } from "popup/components/InternalTransaction/EditSettings";
import { FeesPane } from "popup/components/InternalTransaction/FeesPane";
import { EditMemo } from "popup/components/InternalTransaction/EditMemo";
import { ReviewTx } from "popup/components/InternalTransaction/ReviewTransaction";
import { AddressTile } from "popup/components/send/AddressTile";
import { SelectedCollectible } from "popup/components/sendCollectible/SelectedCollectible";

import { AppDataType } from "helpers/hooks/useGetAppData";
import { useGetSendAmountData } from "./hooks/useSendAmountData";
import { SimulateTxData, SimulateResult } from "./hooks/useSimulateTxData";
import { SlideupModal } from "popup/components/SlideupModal";
import { MemoEditingContext } from "popup/constants/send-payment";
import { InputWidthContext } from "popup/views/Send/contexts/inputWidthContext";
import {
  checkIsMuxedSupported,
  getMemoDisabledState,
} from "helpers/muxedAddress";
import { captureException } from "@sentry/browser";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import "../styles.scss";

const DEFAULT_INPUT_WIDTH = 25;
const PERCENTAGE_OPTIONS = [
  ["25%", 25],
  ["50%", 50],
  ["75%", 75],
] as const;

const normalizeNumericString = (value: string) => {
  const cleaned = cleanAmount(value);
  let hasDecimal = false;
  let normalized = "";

  for (const char of cleaned) {
    if (char === ".") {
      if (hasDecimal) {
        continue;
      }
      hasDecimal = true;
    }
    normalized += char;
  }

  return normalized;
};

const getValidBigNumber = (value: string) => {
  const cleanedValue = normalizeNumericString(value);

  if (!cleanedValue || cleanedValue === ".") {
    return null;
  }

  let numericValue: BigNumber;
  try {
    numericValue = new BigNumber(cleanedValue);
  } catch {
    return null;
  }

  return numericValue.isNaN() ? null : numericValue;
};

const isValidPositiveAmount = (value: string) => {
  const numericValue = getValidBigNumber(value);

  return Boolean(numericValue && numericValue.gt(0));
};

// Returns the value to show in FeesPane's total row given the user's current
// draft inclusion fee and the simulated resource fee.  For classic (no
// resource fee) the inclusion fee IS the total.
function buildFeesPaneTotal(
  inclusionFee: string,
  resourceFee: string | undefined,
): string {
  if (!resourceFee) {
    return inclusionFee;
  }
  return new BigNumber(inclusionFee).plus(resourceFee).toFixed();
}

export const SendAmount = ({
  goBack,
  goToNext,
  goToChooseDest,
  goToChooseAsset,
  simulationState,
  fetchSimulationData,
  networkCongestion,
  recommendedFee,
}: {
  goBack: () => void;
  goToNext: () => void;
  goToChooseDest: () => void;
  goToChooseAsset: () => void;
  simulationState: State<SimulateTxData, string>;
  fetchSimulationData: () => Promise<SimulateResult>;
  networkCongestion: NetworkCongestion;
  recommendedFee: string;
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const { transactionData } = useSelector(transactionSubmissionSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const {
    amount,
    amountUsd,
    asset,
    destination,
    destinationAsset,
    federationAddress,
    recipientName,
    isToken,
    transactionFee,
    isCollectible,
    collectibleData,
    manualTransactionFee,
  } = transactionData;
  const fee = transactionFee || recommendedFee;

  // Persist the last-known inclusion fee across re-simulations so the
  // EditSettings input never jumps back to the total fee while LOADING
  // (the request reducer sets data: null on FETCH_DATA_START).
  const lastInclusionFeeRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      simulationState.state === RequestState.SUCCESS &&
      simulationState.data?.inclusionFee
    ) {
      lastInclusionFeeRef.current = simulationState.data.inclusionFee;
    }
  }, [simulationState.state, simulationState.data?.inclusionFee]);

  // Tracks the fee the user explicitly saved via EditSettings this session.
  // Once set, re-simulations no longer overwrite the displayed inclusion fee,
  // mirroring the mobile hasManuallyChanged pattern.
  // Initialized from Redux so the value survives SendAmount unmount/remount
  // (e.g. when the user navigates to pick a recipient address and returns).
  const hasManuallySetFeeRef = useRef<string | null>(manualTransactionFee);

  // For Soroban: prefer the user's manually-saved fee, then the last simulated
  // inclusion fee (base fee only).  For classic: use the current total fee.
  const editSettingsFee =
    isToken || isCollectible
      ? (hasManuallySetFeeRef.current ??
        lastInclusionFeeRef.current ??
        recommendedFee)
      : fee;

  // Holds the fee the user has typed but not yet saved.  Survives the
  // EditSettings unmount that occurs when the fees pane opens so that the
  // input re-initialises to the draft value on return.
  const [draftFeeForDisplay, setDraftFeeForDisplay] = React.useState<
    string | null
  >(null);
  const feeForFeesPane =
    draftFeeForDisplay !== null && draftFeeForDisplay.trim()
      ? draftFeeForDisplay
      : editSettingsFee;

  const { state: sendAmountData, fetchData } = useGetSendAmountData(
    {
      showHidden: false,
      includeIcons: true,
    },
    destination,
  );

  // Tracks the dest+asset pair that simulation was last triggered for, so we
  // can detect changes and re-simulate without watching simulationState.data.
  const simulationDataRef = useRef({ destination: "", asset: "" });

  const cryptoSpanRef = useRef<HTMLSpanElement>(null);
  const fiatSpanRef = useRef<HTMLSpanElement>(null);
  const cryptoInputRef = useRef<HTMLInputElement>(null);
  const usdInputRef = useRef<HTMLInputElement>(null);
  const runAfterUpdate = useRunAfterUpdate();
  const {
    inputWidthCrypto,
    setInputWidthCrypto,
    inputWidthFiat,
    setInputWidthFiat,
  } = React.useContext(InputWidthContext);

  const [inputType, setInputType] = useState<InputType>("crypto");
  const [isEditingMemo, setIsEditingMemo] = React.useState(false);
  const [isEditingSettings, setIsEditingSettings] = React.useState(false);
  const [isShowingFeesPane, setIsShowingFeesPane] = React.useState(false);
  const [isReviewingTx, setIsReviewingTx] = React.useState(false);
  const [contractSupportsMuxed, setContractSupportsMuxed] = React.useState<
    boolean | null
  >(null);
  // Mirror mobile behavior: preserve the amount from the field the user
  // actually edited; only convert when switching away from that source field.
  const [editedInputType, setEditedInputType] = useState<InputType>("crypto");

  // Get contract ID for custom tokens - must be before conditional returns
  const contractId = React.useMemo(
    () =>
      getContractIdFromTransactionData({
        isCollectible,
        collectionAddress: collectibleData.collectionAddress,
        isToken,
        asset,
        networkDetails,
      }),
    [
      isToken,
      isCollectible,
      asset,
      collectibleData.collectionAddress,
      networkDetails,
    ],
  );

  // Check if recipient is muxed - must be before conditional returns
  const isRecipientMuxed = React.useMemo(
    () => (destination ? isMuxedAccount(destination) : false),
    [destination],
  );

  // Check if contract supports muxed addresses (Soroban mux support) for all custom tokens
  // Tokens without Soroban mux support don't support memo at all (neither G nor M addresses)
  // Tokens with Soroban mux support allow memo for G addresses, but memo is encoded in M addresses
  // Must be before conditional returns
  React.useEffect(() => {
    let isMounted = true;

    const checkContract = async () => {
      if (
        (!isToken && !isCollectible) ||
        !destination ||
        !contractId ||
        !networkDetails
      ) {
        setContractSupportsMuxed(null);
        return;
      }

      try {
        const supportsMuxed = await checkIsMuxedSupported({
          contractId,
          networkDetails,
        });
        if (isMounted) {
          setContractSupportsMuxed(supportsMuxed);
        }
      } catch (error) {
        // On error, assume no support for safety
        captureException(error, {
          extra: {
            message: "Error checking contract muxed support",
          },
        });
        if (isMounted) {
          setContractSupportsMuxed(false);
        }
      }
    };

    checkContract();

    return () => {
      isMounted = false;
    };
  }, [isToken, isCollectible, destination, contractId, networkDetails]);

  // Get memo disabled state using the helper
  const memoDisabledState = React.useMemo(() => {
    if (!destination) {
      return { isMemoDisabled: false, memoDisabledMessage: undefined };
    }
    return getMemoDisabledState({
      targetAddress: destination,
      contractId,
      contractSupportsMuxed,
      networkDetails,
      t,
    });
  }, [destination, contractId, contractSupportsMuxed, networkDetails, t]);

  const { isMemoDisabled, memoDisabledMessage } = memoDisabledState;

  // Determine if contract doesn't support muxed (without Soroban mux support) - transaction should be disabled
  const isMuxedAddressWithoutMemoSupport = React.useMemo(
    () =>
      isRecipientMuxed &&
      (isToken || isCollectible) &&
      contractSupportsMuxed === false,
    [isRecipientMuxed, isToken, isCollectible, contractSupportsMuxed],
  );
  const [memoEditingContext, setMemoEditingContext] =
    React.useState<MemoEditingContext | null>(null);

  const handlePaymentContinue = async () => {
    const nextAmount =
      inputType === "crypto" ? formik.values.amount : effectiveTokenAmount;

    if (!isValidPositiveAmount(nextAmount)) {
      return;
    }

    dispatch(saveAmount(normalizeNumericString(nextAmount)));
    await handleContinue();
  };

  const handleContinue = async () => {
    if (isToken || isCollectible) {
      // Reset to the inclusion fee before re-simulating. After a prior
      // simulation, saveTransactionFee stored the TOTAL (inclusion + resource).
      // Without this reset that total would be used as baseFee on the next run,
      // inflating both inclusionFee and recommendedFee.  Prefer any fee the
      // user explicitly saved via EditSettings over the simulated base fee.
      dispatch(
        saveTransactionFee(
          hasManuallySetFeeRef.current ??
            lastInclusionFeeRef.current ??
            recommendedFee,
        ),
      );
    } else if (!transactionFee) {
      dispatch(saveTransactionFee(fee));
    }
    const simResult = await fetchSimulationData();
    // For Soroban, only open the review modal on success — on failure the fee
    // display shows the error state and the user can retry.
    // For classic sends, always proceed to review: ReviewTx already handles the
    // error UI for RequestState.ERROR, so blocking navigation would leave the
    // user with no feedback path.
    // Note: for Soroban, fetchSimulationData internally dispatches
    // saveTransactionFee again with the simulated total fee. The dispatch
    // above resets to the inclusion fee so the simulation starts from a clean
    // base; the one inside fetchSimulationData overwrites it with the result.
    if (simResult.ok || (!isToken && !isCollectible)) {
      setIsReviewingTx(true);
    }
  };

  const validate = (values: { amount: string }) => {
    const valueToValidate =
      inputType === "crypto" ? values.amount : effectiveTokenAmount;
    const cleanedValue = normalizeNumericString(valueToValidate);

    if (
      cleanedValue.indexOf(".") !== -1 &&
      cleanedValue.split(".")[1].length > 7
    ) {
      return { amount: AMOUNT_ERROR.DEC_MAX };
    }
    if (
      cleanedValue &&
      cleanedValue !== "." &&
      new BigNumber(cleanedValue).gt(new BigNumber(TX_SEND_MAX))
    ) {
      return { amount: AMOUNT_ERROR.SEND_MAX };
    }
    return {};
  };

  const formik = useFormik({
    initialValues: { amount, amountUsd: amountUsd, asset, destinationAsset },
    onSubmit: handlePaymentContinue,
    validate,
    enableReinitialize: true,
    validateOnChange: true,
  });

  useLayoutEffect(() => {
    if (cryptoSpanRef.current) {
      setInputWidthCrypto(cryptoSpanRef.current.offsetWidth + 2);
    }
  }, [formik.values.amount, setInputWidthCrypto]);

  useLayoutEffect(() => {
    if (fiatSpanRef.current) {
      setInputWidthFiat(fiatSpanRef.current.offsetWidth + 4);
    }
  }, [formik.values.amountUsd, setInputWidthFiat]);

  const srcAsset = getAssetFromCanonical(asset);
  const parsedSourceAsset = getAssetFromCanonical(formik.values.asset);
  const isLoading =
    sendAmountData.state === RequestState.IDLE ||
    sendAmountData.state === RequestState.LOADING;

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    formik.setValues({
      amount,
      amountUsd,
      asset,
      destinationAsset,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, destinationAsset]);

  // Soroban: re-simulate whenever destination or asset changes (and on first
  // mount if both are ready). simulationDataRef tracks what was last simulated so
  // we detect genuine changes without watching simulationState.data.
  // simulationState.state is also a dependency so that if a change arrives while
  // a simulation is already in-flight, we re-evaluate once it settles and trigger
  // a new simulation if the inputs have since diverged.
  useEffect(() => {
    if (!(isToken || isCollectible)) return;
    if (!destination) return;
    // Don't stack concurrent simulations.
    if (simulationState.state === RequestState.LOADING) return;

    const destChanged = simulationDataRef.current.destination !== destination;
    const assetChanged = simulationDataRef.current.asset !== asset;

    if (destChanged || assetChanged) {
      // Reset to inclusion fee before re-simulating so total fee from a prior
      // simulation isn't used as baseFee (which would inflate the result).
      // Prefer the user's manually-saved fee if present.
      if (isToken || isCollectible) {
        dispatch(
          saveTransactionFee(
            hasManuallySetFeeRef.current ??
              lastInclusionFeeRef.current ??
              recommendedFee,
          ),
        );
      }
      simulationDataRef.current = { destination, asset };
      fetchSimulationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, asset, isToken, isCollectible, simulationState.state]);

  // If the user was in fiat mode and current asset no longer has a USD price,
  // force back to crypto mode so the input is still operable.
  useEffect(() => {
    if (
      inputType === "fiat" &&
      sendAmountData.state === RequestState.SUCCESS &&
      sendAmountData.data?.type === AppDataType.RESOLVED
    ) {
      const currentAssetPrice =
        sendAmountData.data.tokenPrices?.[asset]?.currentPrice;
      if (!currentAssetPrice) {
        setInputType("crypto");
      }
    }
  }, [inputType, sendAmountData.state, sendAmountData.data, asset]);

  const getAmountFontSize = () => {
    const currentValue =
      inputType === "fiat" ? formik.values.amountUsd : formik.values.amount;
    const digitsLength = currentValue.replace(/[^0-9]/g, "").length;

    if (digitsLength <= 6) {
      return "lg";
    }
    if (digitsLength <= 10) {
      return "med";
    }
    if (digitsLength <= 13) {
      return "small";
    }
    return "xsmall";
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

  // Use getBalanceByKey for tokens (contract ID), getBalanceByAsset for classic assets
  const assetBalance =
    isToken && contractId
      ? getBalanceByKey(
          contractId,
          sendData.userBalances.balances,
          networkDetails,
        )
      : getBalanceByAsset(srcAsset, sendData.userBalances.balances);
  const prices = sendData.tokenPrices;
  const assetPrice = prices[asset] && prices[asset].currentPrice;
  const assetDecimals = getAssetDecimals(asset, sendData.userBalances, isToken);
  const amountBigNumber = getValidBigNumber(formik.values.amount);
  const amountUsdBigNumber = getValidBigNumber(formik.values.amountUsd);
  const priceValue = assetPrice
    ? amountUsdBigNumber
      ? amountUsdBigNumber
          .dividedBy(new BigNumber(assetPrice))
          .decimalPlaces(assetDecimals)
          .toString()
      : null
    : null;
  const priceValueUsd = assetPrice
    ? amountBigNumber
      ? `${formatAmount(
          roundUsdValue(
            new BigNumber(assetPrice).multipliedBy(amountBigNumber).toString(),
          ),
        )}`
      : null
    : null;
  const effectiveTokenAmount =
    inputType === "fiat" && editedInputType === "crypto"
      ? normalizeNumericString(formik.values.amount)
      : (priceValue ?? "");
  const supportsUsd = !!assetPrice;

  const availableBalance = getAvailableBalance({
    assetCanonical: asset,
    balances: sendData.userBalances.balances,
    recommendedFee: fee,
  });
  const displayTotal =
    assetBalance && "decimals" in assetBalance
      ? availableBalance
      : formatAmount(availableBalance);

  const goBackAction = () => {
    dispatch(saveAsset("native"));
    dispatch(saveIsToken(false));
    dispatch(saveAmount("0"));
    dispatch(saveAmountUsd("0.00"));
    // Clear any manually-saved fee so the next send session always starts from
    // the simulated base fee rather than a stale override.
    dispatch(saveTransactionFee(""));
    dispatch(saveManualTransactionFee(null));
    goBack();
  };
  const goToChooseAssetAction = () => {
    // Changing the asset may switch between Soroban and classic (or a different
    // token), so any manually-saved fee from the prior asset should not carry
    // over.  Clear it here before navigating so post-remount the fee is derived
    // freshly from the new asset's simulation.
    dispatch(saveTransactionFee(""));
    dispatch(saveManualTransactionFee(null));
    hasManuallySetFeeRef.current = null;
    lastInclusionFeeRef.current = null;
    goToChooseAsset();
  };

  const isAmountTooHigh =
    (inputType === "crypto" &&
      Boolean(amountBigNumber?.gt(new BigNumber(availableBalance)))) ||
    (inputType === "fiat" &&
      Boolean(
        getValidBigNumber(effectiveTokenAmount)?.gt(
          new BigNumber(availableBalance),
        ),
      ));

  const isAmountInputValid =
    inputType === "crypto"
      ? isValidPositiveAmount(formik.values.amount)
      : isValidPositiveAmount(formik.values.amountUsd) &&
        isValidPositiveAmount(effectiveTokenAmount);

  const handlePercentage = (pct: number) => {
    if (pct === 100) {
      emitMetric(METRIC_NAMES.sendPaymentSetMax);
    }

    const fraction = new BigNumber(pct).dividedBy(100);
    if (inputType === "fiat" && assetPrice) {
      const pctUsd = formatAmount(
        roundUsdValue(
          new BigNumber(assetPrice)
            .multipliedBy(new BigNumber(cleanAmount(availableBalance)))
            .multipliedBy(fraction)
            .toString(),
        ),
      );
      formik.setFieldValue("amountUsd", pctUsd);
      dispatch(saveAmountUsd(pctUsd));
      setEditedInputType("fiat");
    } else {
      const pctAmount = new BigNumber(cleanAmount(availableBalance))
        .multipliedBy(fraction)
        .decimalPlaces(assetDecimals)
        .toString();
      formik.setFieldValue("amount", pctAmount);
      dispatch(saveAmount(pctAmount));
      setEditedInputType("crypto");
    }
  };

  return (
    <React.Fragment>
      <SubviewHeader
        title={<span>{t("Send")}</span>}
        hasBackButton
        customBackAction={goBackAction}
        customBackIcon={<Icon.X />}
        rightButton={
          <button
            className="SendAmount__header-settings-btn"
            data-testid="send-amount-btn-fee"
            aria-label={t("Send settings")}
            onClick={() => {
              setIsEditingSettings(true);
              if (
                (isToken || isCollectible) &&
                destination &&
                simulationState.state !== RequestState.SUCCESS &&
                simulationState.state !== RequestState.LOADING
              ) {
                fetchSimulationData();
              }
            }}
          >
            <Icon.Settings01 />
          </button>
        }
      />
      <View.Content
        hasNoTopPadding={isCollectible}
        contentFooter={
          <div className="SendAmount__btn-continue">
            {isCollectible ? (
              <>
                {(isToken || isCollectible) &&
                simulationState.state === RequestState.ERROR ? (
                  <Notification
                    variant="error"
                    icon={<Icon.AlertCircle />}
                    title={t("Failed to fetch your transaction details")}
                  >
                    {simulationState.error}
                  </Notification>
                ) : null}
                <Button
                  size="lg"
                  disabled={
                    !destination ||
                    isMuxedAddressWithoutMemoSupport ||
                    simulationState.state === RequestState.ERROR
                  }
                  isLoading={simulationState.state === RequestState.LOADING}
                  data-testid="send-collectible-btn-continue"
                  isFullWidth
                  isRounded
                  variant="secondary"
                  onClick={handleContinue}
                >
                  {t("Review Send")}
                </Button>
              </>
            ) : (
              <>
                {(isToken || isCollectible) &&
                simulationState.state === RequestState.ERROR ? (
                  <Notification
                    variant="error"
                    icon={<Icon.AlertCircle />}
                    title={t("Failed to fetch your transaction details")}
                  >
                    {simulationState.error}
                  </Notification>
                ) : null}
                <Button
                  size="lg"
                  disabled={
                    !destination ||
                    !isAmountInputValid ||
                    isAmountTooHigh ||
                    isMuxedAddressWithoutMemoSupport ||
                    ((isToken || isCollectible) &&
                      simulationState.state === RequestState.ERROR)
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
                  {!isAmountInputValid
                    ? t("Enter an amount")
                    : t("Review Send")}
                </Button>
              </>
            )}
          </div>
        }
      >
        <div className="SendAmount">
          {isMuxedAddressWithoutMemoSupport && (
            <div className="SendAmount__warning-banner">
              <Notification
                variant="error"
                icon={<Icon.AlertCircle />}
                title={t("Muxed address not supported")}
              >
                {t(
                  "This token does not support muxed address (M-) as a target destination.",
                )}
              </Notification>
            </div>
          )}
          <div className="SendAmount__content">
            {transactionData.isCollectible ? (
              <div className="SendAmount__collectible-display">
                <SelectedCollectible goToChooseDest={goToChooseDest} />
              </div>
            ) : (
              <form>
                <div className="SendAmount__simplebar__content">
                  {/* Recipient at TOP */}
                  <AddressTile
                    address={destination}
                    federationAddress={federationAddress}
                    recipientName={recipientName}
                    onClick={goToChooseDest}
                  />

                  {/* Amount card: matches mobile's rounded card container */}
                  <div className="SendAmount__amount-card">
                    {/* Sending label */}
                    <div className="SendAmount__sending-label">
                      {t("Sending")}
                    </div>

                    {/* Amount row: input + inline asset selector */}
                    <div className="SendAmount__amount-row">
                      <div className="SendAmount__amount-input-container">
                        {inputType === "crypto" && (
                          <>
                            <span
                              ref={cryptoSpanRef}
                              className={`SendAmount__input-amount SendAmount__${getAmountFontSize()}`}
                              style={{
                                position: "absolute",
                                visibility: "hidden",
                                whiteSpace: "pre",
                              }}
                            >
                              {formik.values.amount || "0"}
                            </span>
                            <input
                              ref={cryptoInputRef}
                              className={`SendAmount__input-amount SendAmount__${getAmountFontSize()}`}
                              style={{
                                width: `${inputWidthCrypto || DEFAULT_INPUT_WIDTH}px`,
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
                                setEditedInputType("crypto");
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
                        {inputType === "fiat" && (
                          <>
                            <div
                              className={`SendAmount__amount-label-usd SendAmount__${getAmountFontSize()}`}
                            >
                              $
                            </div>
                            <span
                              ref={fiatSpanRef}
                              className={`SendAmount__input-amount SendAmount__${getAmountFontSize()}`}
                              style={{
                                position: "absolute",
                                visibility: "hidden",
                                whiteSpace: "pre",
                              }}
                            >
                              {formik.values.amountUsd || "0"}
                            </span>
                            <input
                              ref={usdInputRef}
                              className={`SendAmount__input-amount SendAmount__${getAmountFontSize()}`}
                              style={{
                                width: `${inputWidthFiat || DEFAULT_INPUT_WIDTH}px`,
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
                                setEditedInputType("fiat");
                                runAfterUpdate(() => {
                                  input.selectionStart = newCursor;
                                  input.selectionEnd = newCursor;
                                });
                              }}
                              autoFocus
                              autoComplete="off"
                              onFocus={(e) => e.target.select()}
                            />
                          </>
                        )}
                      </div>
                      <button
                        type="button"
                        className="SendAmount__asset-selector-inline"
                        onClick={goToChooseAssetAction}
                        data-testid="send-amount-edit-dest-asset"
                        aria-label={t("Change asset")}
                      >
                        <AssetIcon
                          assetIcons={
                            asset !== "native" ? { [asset]: assetIcon } : {}
                          }
                          code={srcAsset.code}
                          issuerKey={srcAsset.issuer}
                          icon={assetIcon}
                          isSuspicious={false}
                        />
                        <span className="SendAmount__asset-code">
                          {parsedSourceAsset.code}
                        </span>
                        <Icon.ChevronDown />
                      </button>
                    </div>

                    {/* Secondary row: USD equivalent and available balance */}
                    <div className="SendAmount__balance-row">
                      <div className="SendAmount__amount-price">
                        {supportsUsd
                          ? inputType === "crypto"
                            ? `$${priceValueUsd || "0.00"}`
                            : `${formatAmount(effectiveTokenAmount || "0")} ${parsedSourceAsset.code}`
                          : null}
                        {supportsUsd && (
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
                                // If crypto was the last edited field, keep the exact
                                // typed token amount. Otherwise convert from fiat.
                                const converted =
                                  editedInputType === "crypto"
                                    ? formik.values.amount || "0"
                                    : (priceValue ?? "0");
                                dispatch(saveAmount(converted));
                                formik.setFieldValue("amount", converted);
                              }
                              if (newInputType === "fiat") {
                                // If fiat was the last edited field, keep the exact
                                // typed fiat amount. Otherwise convert from token.
                                const raw =
                                  editedInputType === "fiat"
                                    ? formik.values.amountUsd || "0"
                                    : (priceValueUsd ?? "0");
                                const converted = raw === "0.00" ? "0" : raw;
                                dispatch(saveAmountUsd(converted));
                                formik.setFieldValue("amountUsd", converted);
                              }
                              setInputType(newInputType);
                            }}
                          >
                            <Icon.RefreshCw03 />
                          </Button>
                        )}
                      </div>
                      <div className="SendAmount__available-balance">
                        {displayTotal} {parsedSourceAsset.code}
                      </div>
                    </div>

                    {/* Error state */}
                    {isAmountTooHigh && (
                      <div className="SendAmount__invalid-state">
                        <Icon.AlertCircle />
                        <span>
                          {t(
                            "You don’t have enough {{asset}} in your account",
                            {
                              asset: parsedSourceAsset.code,
                            },
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Percentage buttons */}
                  <div className="SendAmount__pct-buttons">
                    {PERCENTAGE_OPTIONS.map(([label, pct]) => (
                      <button
                        key={label}
                        className="SendAmount__pct-btn"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePercentage(pct);
                        }}
                      >
                        {label}
                      </button>
                    ))}
                    <button
                      className="SendAmount__pct-btn"
                      type="button"
                      data-testid="SendAmountSetMax"
                      onClick={(e) => {
                        e.preventDefault();
                        handlePercentage(100);
                      }}
                    >
                      {t("Max")}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </View.Content>
      {isEditingMemo ? (
        <>
          <div className="EditMemoWrapper">
            <EditMemo
              memo={transactionData.memo || ""}
              onClose={() => {
                setIsEditingMemo(false);
                // Reopen review sheet if user came from review flow
                if (memoEditingContext === MemoEditingContext.Review) {
                  setIsReviewingTx(true);
                }
                setMemoEditingContext(null);
              }}
              onSubmit={async ({ memo }: { memo: string }) => {
                dispatch(saveMemo(memo));
                setIsEditingMemo(false);
                // Regenerate transaction XDR with new memo (now reads memo from Redux state inside fetchData)
                await fetchSimulationData();
                // Reopen review sheet after memo is saved and XDR is regenerated only if user came from review flow
                if (memoEditingContext === MemoEditingContext.Review) {
                  setIsReviewingTx(true);
                  setMemoEditingContext(null);
                }
              }}
              disabled={isMemoDisabled}
              disabledMessage={memoDisabledMessage}
            />
          </div>
          <LoadingBackground
            onClick={() => {
              setIsEditingMemo(false);
              // Reopen review sheet if user came from review flow
              if (memoEditingContext === MemoEditingContext.Review) {
                setIsReviewingTx(true);
              }
              setMemoEditingContext(null);
            }}
            isActive={isEditingMemo}
          />
        </>
      ) : null}
      {isEditingSettings && !isShowingFeesPane ? (
        <>
          <div className="EditMemoWrapper">
            <EditSettings
              fee={draftFeeForDisplay ?? editSettingsFee}
              defaultFee={recommendedFee}
              title={t("Send Settings")}
              timeout={transactionData.transactionTimeout}
              congestion={networkCongestion}
              isSoroban={isToken || isCollectible}
              onFeeChange={(v) => {
                setDraftFeeForDisplay(v);
              }}
              onClose={() => {
                setIsEditingSettings(false);
                setDraftFeeForDisplay(null);
              }}
              onShowFeesInfo={(currentDraftFee) => {
                trackSendFeeBreakdownOpened("settings");
                setDraftFeeForDisplay(currentDraftFee);
                setIsShowingFeesPane(true);
              }}
              onSubmit={async ({
                fee,
                timeout,
              }: {
                fee: string;
                timeout: number;
              }) => {
                const nextFee = fee.trim() || editSettingsFee;
                dispatch(saveTransactionFee(nextFee));
                dispatch(saveTransactionTimeout(timeout));
                hasManuallySetFeeRef.current = nextFee;
                dispatch(saveManualTransactionFee(nextFee));
                setIsEditingSettings(false);
                setDraftFeeForDisplay(null);
                if (destination) {
                  await fetchSimulationData();
                }
              }}
            />
          </div>
          <LoadingBackground
            onClick={() => {
              setIsEditingSettings(false);
              setDraftFeeForDisplay(null);
            }}
            isActive={isEditingSettings}
          />
        </>
      ) : null}
      {isShowingFeesPane ? (
        <SlideupModal
          setIsModalOpen={() => {
            setIsShowingFeesPane(false);
            setIsEditingSettings(true);
          }}
          isModalOpen={isShowingFeesPane}
        >
          <View.Inset>
            <div className="SendAmount__FeesPane">
              <FeesPane
                fee={buildFeesPaneTotal(
                  feeForFeesPane,
                  simulationState.state === RequestState.ERROR
                    ? undefined
                    : simulationState.data?.resourceFee,
                )}
                simulationState={simulationState}
                isSoroban={isToken || isCollectible}
                onClose={() => {
                  setIsShowingFeesPane(false);
                  setIsEditingSettings(true);
                }}
              />
            </div>
          </View.Inset>
        </SlideupModal>
      ) : null}
      <SlideupModal
        setIsModalOpen={() => setIsReviewingTx(false)}
        isModalOpen={isReviewingTx}
      >
        {isReviewingTx ? (
          <ReviewTx
            assetIcon={assetIcon}
            fee={fee}
            networkDetails={sendAmountData.data?.networkDetails!}
            onCancel={() => setIsReviewingTx(false)}
            onConfirm={goToNext}
            onAddMemo={() => {
              setIsReviewingTx(false);
              setMemoEditingContext(MemoEditingContext.Review);
              setIsEditingMemo(true);
            }}
            sendAmount={amount}
            sendPriceUsd={priceValueUsd}
            simulationState={simulationState}
            srcAsset={asset}
            title={t("You are sending")}
          />
        ) : (
          <></>
        )}
      </SlideupModal>
    </React.Fragment>
  );
};
