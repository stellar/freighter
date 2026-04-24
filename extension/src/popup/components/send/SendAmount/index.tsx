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
import {
  getAssetFromCanonical,
  isMainnet,
  isMuxedAccount,
} from "helpers/stellar";
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
import { SimulateTxData } from "./hooks/useSimulateTxData";
import { InputWidthContext } from "popup/views/Send/contexts/inputWidthContext";
import { SlideupModal } from "popup/components/SlideupModal";
import { MemoEditingContext } from "popup/constants/send-payment";
import {
  checkIsMuxedSupported,
  getMemoDisabledState,
} from "helpers/muxedAddress";
import { captureException } from "@sentry/browser";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import "../styles.scss";

const DEFAULT_INPUT_WIDTH = 25;

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
  fetchSimulationData: () => Promise<unknown>;
  networkCongestion: NetworkCongestion;
  recommendedFee: string;
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const runAfterUpdate = useRunAfterUpdate();
  const { transactionData } = useSelector(transactionSubmissionSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const {
    amount,
    amountUsd,
    asset,
    destination,
    destinationAsset,
    federationAddress,
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
  if (
    simulationState.state === RequestState.SUCCESS &&
    simulationState.data?.inclusionFee
  ) {
    lastInclusionFeeRef.current = simulationState.data.inclusionFee;
  }

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

  const { state: sendAmountData, fetchData } = useGetSendAmountData(
    {
      showHidden: false,
      includeIcons: true,
    },
    destination,
  );
  const cryptoSpanRef = useRef<HTMLSpanElement>(null);

  const fiatSpanRef = useRef<HTMLSpanElement>(null);
  const {
    inputWidthCrypto,
    setInputWidthCrypto,
    inputWidthFiat,
    setInputWidthFiat,
  } = React.useContext(InputWidthContext);

  const cryptoInputRef = useRef<HTMLInputElement>(null);
  const usdInputRef = useRef<HTMLInputElement>(null);
  // Tracks the dest+asset pair that simulation was last triggered for, so we
  // can detect changes and re-simulate without watching simulationState.data.
  const simulationDataRef = useRef({ destination: "", asset: "" });

  const [inputType, setInputType] = useState<InputType>("crypto");
  const [isEditingMemo, setIsEditingMemo] = React.useState(false);
  const [isEditingSettings, setIsEditingSettings] = React.useState(false);
  const [isShowingFeesPane, setIsShowingFeesPane] = React.useState(false);
  // Holds the fee value shown in FeesPane's total row. Updated to reflect the
  // user's current draft inclusion fee before the pane opens.
  const [feesPaneTotal, setFeesPaneTotal] = React.useState(fee);
  const [isReviewingTx, setIsReviewingTx] = React.useState(false);
  const [contractSupportsMuxed, setContractSupportsMuxed] = React.useState<
    boolean | null
  >(null);

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
        setContractSupportsMuxed(supportsMuxed);
      } catch (error) {
        // On error, assume no support for safety
        captureException(error, {
          extra: {
            message: "Error checking contract muxed support",
          },
        });
        setContractSupportsMuxed(false);
      }
    };

    checkContract();
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
    const amount = inputType === "crypto" ? formik.values.amount : priceValue!;
    dispatch(saveAmount(cleanAmount(amount)));
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
    // fetchSimulationData returns the SimulateTxData payload on success and
    // the caught Error on failure. Only open the review modal when the
    // simulation succeeded — on failure the fee display shows the error
    // state and the user can retry.
    if (!(simResult instanceof Error)) {
      setIsReviewingTx(true);
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Soroban: re-simulate whenever destination or asset changes (and on first
  // mount if both are ready). simulationDataRef tracks what was last simulated so
  // we detect genuine changes without watching simulationState.data.
  // simulationState.state is included so that if a change arrives while a
  // simulation is already in-flight, we retry once it finishes.
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
    ? `$${formatAmount(
        roundUsdValue(
          new BigNumber(xlmPrice).multipliedBy(new BigNumber(fee)).toString(),
        ),
      )}`
    : null;
  const supportsUsd =
    isMainnet(sendAmountData.data?.networkDetails!) && assetPrice;
  const availableBalance = getAvailableBalance({
    assetCanonical: asset,
    balances: sendData.userBalances.balances,
    recommendedFee: fee,
  });
  const displayTotal =
    assetBalance && "decimals" in assetBalance
      ? availableBalance
      : formatAmount(availableBalance);
  const srcTitle = srcAsset.code;
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
    if (isCollectible) {
      goToChooseAssetAction();
    }
  };
  const goToChooseAssetAction = () => {
    // Changing the asset may switch between Soroban and classic (or a different
    // token), so any manually-saved fee from the prior asset should not carry
    // over.  Clear it here before navigating so post-remount the fee is derived
    // freshly from the new asset's simulation.
    dispatch(saveManualTransactionFee(null));
    hasManuallySetFeeRef.current = null;
    goToChooseAsset();
  };

  const isAmountTooHigh =
    (inputType === "crypto" &&
      new BigNumber(cleanAmount(formik.values.amount)).gt(
        new BigNumber(availableBalance),
      )) ||
    (inputType === "fiat" &&
      new BigNumber(cleanAmount(priceValue!)).gt(
        new BigNumber(availableBalance),
      ));

  return (
    <React.Fragment>
      <SubviewHeader
        title={<span>{t("Send")}</span>}
        hasBackButton
        customBackAction={goBackAction}
      />
      <View.Content
        hasNoTopPadding={isCollectible}
        contentFooter={
          <div className="SendAmount__btn-continue">
            <div className="SendAmount__settings-row">
              <div className="SendAmount__settings-fee-display">
                <span className="SendAmount__settings-fee-display__label">
                  {t("Fee")}:
                </span>
                <span data-testid="send-amount-fee-display">
                  {(isToken || isCollectible) &&
                  (simulationState.state === RequestState.LOADING ||
                    simulationState.state === RequestState.ERROR)
                    ? t("Calculating...")
                    : inputType === "crypto"
                      ? `${fee} ${t("XLM")}`
                      : recommendedFeeUsd}
                </span>
              </div>
              <div className="SendAmount__settings-options">
                <Button
                  data-testid="send-amount-btn-memo"
                  size="md"
                  isRounded
                  variant="tertiary"
                  onClick={() => {
                    setMemoEditingContext(MemoEditingContext.SendPayment);
                    setIsEditingMemo(true);
                  }}
                  icon={<Icon.File02 />}
                  iconPosition="left"
                >
                  {t("Memo")}
                </Button>
                <Button
                  data-testid="send-amount-btn-fee"
                  size="md"
                  isRounded
                  variant="tertiary"
                  onClick={() => {
                    setIsEditingSettings(true);
                    // For Soroban tokens with a destination, trigger simulation
                    // immediately so fee input and FeesPane reflect correct amounts.
                    // Without a destination simulation would fail — skip it and let
                    // FeesPane show the base fee (matching mobile behaviour).
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
                </Button>
              </div>
            </div>
            {isCollectible ? (
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
            ) : (
              <Button
                size="lg"
                disabled={
                  !destination ||
                  (inputType === "crypto" &&
                    new BigNumber(formik.values.amount).isZero()) ||
                  (inputType === "fiat" &&
                    new BigNumber(formik.values.amountUsd).isZero()) ||
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
                {t("Review Send")}
              </Button>
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
                        ? `$${priceValueUsd}`
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
                  <div className="SendAmount__invalid-state">
                    {isAmountTooHigh && (
                      <>
                        <Icon.AlertCircle />
                        <span>
                          {t(
                            "You don’t have enough {{asset}} in your account",
                            {
                              asset: parsedSourceAsset.code,
                            },
                          )}
                        </span>
                      </>
                    )}
                  </div>
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
                  <div
                    className="SendAmount__EditDestAsset"
                    onClick={goToChooseAssetAction}
                    data-testid="send-amount-edit-dest-asset"
                  >
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
                    <Button isRounded size="sm" variant="tertiary">
                      <Icon.ChevronRight />
                    </Button>
                  </div>
                  <AddressTile
                    address={destination}
                    federationAddress={federationAddress}
                    onClick={goToChooseDest}
                  />
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
                const inclusionFee =
                  currentDraftFee ||
                  (lastInclusionFeeRef.current ?? recommendedFee);
                setFeesPaneTotal(
                  buildFeesPaneTotal(
                    inclusionFee,
                    simulationState.data?.resourceFee,
                  ),
                );
                setIsShowingFeesPane(true);
              }}
              onSubmit={async ({
                fee,
                timeout,
              }: {
                fee: string;
                timeout: number;
              }) => {
                dispatch(saveTransactionFee(fee));
                dispatch(saveTransactionTimeout(timeout));
                hasManuallySetFeeRef.current = fee;
                dispatch(saveManualTransactionFee(fee));
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
                fee={feesPaneTotal}
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
