import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Form, Field, FieldProps, Formik, useFormik } from "formik";
import { debounce } from "lodash";
import BigNumber from "bignumber.js";
import { object as YupObject, number as YupNumber } from "yup";
import {
  Button,
  Card,
  Icon,
  Input,
  Notification,
} from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  saveAllowedSlippage,
  saveAmount,
  saveAmountUsd,
  saveAsset,
  saveDestinationAsset,
  saveSwapBestPath,
  saveTransactionFee,
  saveTransactionTimeout,
  transactionDataSelector,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import {
  cleanAmount,
  formatAmount,
  roundUsdValue,
} from "popup/helpers/formatters";
import { TX_SEND_MAX } from "popup/constants/transaction";
import { useGetSwapAmountData } from "./hooks/useGetSwapAmountData";
import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isMainnet,
} from "helpers/stellar";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import { getAssetDecimals, getAvailableBalance } from "popup/helpers/soroban";
import { AppDispatch } from "popup/App";
import { emitMetric } from "helpers/metrics";
import { AMOUNT_ERROR, InputType } from "helpers/transaction";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { EditSettings } from "popup/components/InternalTransaction/EditSettings";
import { ReviewTx } from "popup/components/InternalTransaction/ReviewTransaction";
import { useSimulateTxData } from "./hooks/useSimulateSwapData";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { SlideupModal } from "popup/components/SlideupModal";
import { AmountCard } from "popup/components/amount/AmountCard";
import { PercentageButtons } from "popup/components/amount/PercentageButtons";
import { shouldShowXlmReservePreflight } from "popup/helpers/xlmReserve";
import { horizonGetBestPath } from "popup/helpers/horizonGetBestPath";
import { XlmReserveSheet } from "popup/components/swap/XlmReserveSheet";

import "./styles.scss";

const defaultSlippage = "2";

const AVAILABLE_BALANCE_FONT_SIZES = [
  { maxLen: 28, sizePx: 14 },
  { maxLen: 42, sizePx: 12 },
  { maxLen: Infinity, sizePx: 11 },
] as const;

interface SwapAmountProps {
  inputType: InputType;
  setInputType: (type: InputType) => void;
  goBack: () => void;
  goToNext: () => void;
  goToEditSrc: () => void;
  goToEditDst: () => void;
}

export const SwapAmount = ({
  inputType,
  setInputType,
  goBack,
  goToNext,
  goToEditSrc,
  goToEditDst,
}: SwapAmountProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { networkCongestion, recommendedFee } = useNetworkFees();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const { transactionData } = useSelector(transactionSubmissionSelector);
  const {
    allowedSlippage,
    amount,
    amountUsd,
    asset,
    destination,
    destinationAmount,
    destinationAsset,
    isToken,
    memo,
    path,
    transactionFee,
    transactionTimeout,
  } = transactionData;
  const fee = transactionFee || recommendedFee;
  const srcAsset = getAssetFromCanonical(asset);
  const dstAsset = destinationAsset
    ? getAssetFromCanonical(destinationAsset)
    : null;

  const { state: swapAmountData, fetchData } = useGetSwapAmountData(
    {
      showHidden: false,
      includeIcons: true,
    },
    destination,
  );
  const {
    state: simulationState,
    fetchData: fetchSimulationData,
    isQuoteExpired,
  } = useSimulateTxData({
    publicKey,
    networkDetails,
    simParams: {
      sourceAsset: srcAsset,
      destAsset: dstAsset!,
      amount,
      allowedSlippage,
      path,
      transactionFee: fee,
      transactionTimeout,
      memo,
    },
  });

  const [isEditingSlippage, setIsEditingSlippage] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isReviewingTx, setIsReviewingTx] = React.useState(false);
  const [isXlmReserveOpen, setIsXlmReserveOpen] = useState(false);
  const [showQuoteExpired, setShowQuoteExpired] = useState(false);

  const handleContinue = async (values: { amount: string }) => {
    const amountVal =
      inputType === "crypto" ? values.amount : (priceValue ?? "0");
    const cleanedAmount = cleanAmount(amountVal);
    dispatch(saveAmount(cleanedAmount));
    await fetchSimulationData({
      amount: cleanedAmount,
      destinationRate: dstAssetPrice,
    });
    const needsReserve = shouldShowXlmReservePreflight({
      requiresTrustline:
        transactionData.destinationTokenDetails?.requiresTrustline ?? false,
      sourceIsXlm: asset === "native",
      spendableXlm: getAvailableBalance({
        assetCanonical: "native",
        balances: sendData.userBalances.balances,
        recommendedFee: fee,
      }),
    });
    if (needsReserve) {
      emitMetric(METRIC_NAMES.swapXlmReserveShown);
      setIsXlmReserveOpen(true);
      return;
    }
    setIsReviewingTx(true);
  };

  const validate = (values: { amount: string }) => {
    const amount = inputType === "crypto" ? values.amount : (priceValue ?? "0");
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
    initialValues: { amount, amountUsd, asset, destinationAsset },
    onSubmit: handleContinue,
    validate,
    enableReinitialize: true,
    validateOnChange: true,
  });

  const getAmountFontSizeClass = (): "lg" | "med" | "small" | "xsmall" => {
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
  const isLoading =
    swapAmountData.state === RequestState.IDLE ||
    swapAmountData.state === RequestState.LOADING;

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the user was in fiat mode and the current source asset no longer has a
  // USD price (e.g. after a direction-swap or source picker change), force back
  // to crypto mode so priceValue-dependent expressions are always safe.
  useEffect(() => {
    if (
      inputType === "fiat" &&
      swapAmountData.state === RequestState.SUCCESS &&
      swapAmountData.data?.type === AppDataType.RESOLVED
    ) {
      const currentAssetPrice =
        swapAmountData.data.tokenPrices?.[asset]?.currentPrice;
      if (!currentAssetPrice) {
        setInputType("crypto");
      }
    }
  }, [inputType, swapAmountData.state, swapAmountData.data, asset]);

  // Quote-expired surfacing: when the simulate hook flags an expired quote
  // (Horizon op_under_dest_min / op_too_few_offers), emit the metric and show
  // the user-facing notification. The auto-refetch is handled by Phase E's
  // getBestPath retry; this only emits + surfaces the message.
  useEffect(() => {
    if (!isQuoteExpired) {
      setShowQuoteExpired(false);
      return;
    }
    setShowQuoteExpired(true);
    emitMetric(METRIC_NAMES.swapQuoteExpired, {
      sourceToken: asset,
      destToken: destinationAsset,
      sourceAmount: amount,
      destAmount: destinationAmount,
      allowedSlippage,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isQuoteExpired]);

  // Live quote: debounce the source amount and fetch the best path so the
  // "You receive" amount updates as the user types. This is a lightweight
  // path-only lookup (no XDR build / Blockaid scan / quote-expiry surfacing) —
  // the full simulation runs at review time in handleContinue. A monotonic
  // request id discards out-of-order responses; failures reset the displayed
  // amount to 0 so a stale quote never lingers.
  const liveQuoteReqRef = useRef(0);
  const liveQuoteArgsRef = useRef({ asset, destinationAsset, networkDetails });
  liveQuoteArgsRef.current = { asset, destinationAsset, networkDetails };
  const destinationAmountRef = useRef(destinationAmount);
  destinationAmountRef.current = destinationAmount;
  // Once the review sheet is open the quote is frozen — a late live quote must
  // not overwrite (or reset) the amount being reviewed.
  const isReviewingRef = useRef(isReviewingTx);
  isReviewingRef.current = isReviewingTx;

  const debouncedQuote = useMemo(
    () =>
      debounce((quoteAmount: string) => {
        const reqId = ++liveQuoteReqRef.current;
        const {
          asset: src,
          destinationAsset: dst,
          networkDetails: net,
        } = liveQuoteArgsRef.current;
        (async () => {
          try {
            const bestPath = await horizonGetBestPath({
              amount: quoteAmount,
              sourceAsset: src,
              destAsset: dst,
              networkDetails: net,
            });
            if (liveQuoteReqRef.current !== reqId || isReviewingRef.current) {
              return; // superseded by a newer quote, or frozen for review
            }
            if (!bestPath?.destination_amount) {
              dispatch(saveSwapBestPath({ path: [], destinationAmount: "0" }));
              return;
            }
            const path: string[] = [];
            bestPath.path.forEach((p) => {
              if (!p.asset_code && !p.asset_issuer) {
                path.push(p.asset_type);
              } else {
                path.push(getCanonicalFromAsset(p.asset_code, p.asset_issuer));
              }
            });
            dispatch(
              saveSwapBestPath({
                path,
                destinationAmount: bestPath.destination_amount,
              }),
            );
          } catch {
            if (liveQuoteReqRef.current !== reqId || isReviewingRef.current) {
              return;
            }
            // No path / network error: clear the stale received amount.
            dispatch(saveSwapBestPath({ path: [], destinationAmount: "0" }));
          }
        })();
      }, 500),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => () => debouncedQuote.cancel(), [debouncedQuote]);

  useEffect(() => {
    if (
      swapAmountData.state !== RequestState.SUCCESS ||
      swapAmountData.data?.type !== AppDataType.RESOLVED ||
      !destinationAsset
    ) {
      return;
    }
    const livePrices = swapAmountData.data.tokenPrices;
    const liveSrcPrice = livePrices[asset]?.currentPrice;
    const liveDecimals = getAssetDecimals(
      asset,
      swapAmountData.data.userBalances,
      isToken,
    );
    const cryptoAmount =
      inputType === "fiat"
        ? liveSrcPrice
          ? new BigNumber(cleanAmount(amountUsd || "0"))
              .dividedBy(new BigNumber(liveSrcPrice))
              .decimalPlaces(liveDecimals)
              .toString()
          : "0"
        : cleanAmount(amount || "0");

    if (new BigNumber(cryptoAmount || "0").isGreaterThan(0)) {
      debouncedQuote(cryptoAmount);
    } else {
      // Source amount cleared: cancel any pending/in-flight quote and reset the
      // received amount so the card shows 0 (skip the dispatch if already 0).
      debouncedQuote.cancel();
      liveQuoteReqRef.current += 1;
      if (
        destinationAmountRef.current !== "0" &&
        destinationAmountRef.current !== ""
      ) {
        dispatch(saveSwapBestPath({ path: [], destinationAmount: "0" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    amount,
    amountUsd,
    asset,
    destinationAsset,
    inputType,
    swapAmountData.state,
  ]);

  if (isLoading) {
    return <Loading />;
  }

  if (swapAmountData.state === RequestState.ERROR) {
    return (
      <div
        className="SwapAsset__fetch-fail"
        data-testid="swap-amount-fetch-fail"
      >
        <Notification variant="error" title={t("Failed to load swap data.")}>
          {t("Your swap data could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (swapAmountData.data?.type === AppDataType.REROUTE) {
    if (swapAmountData.data.shouldOpenTab) {
      openTab(newTabHref(swapAmountData.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${swapAmountData.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  const data = swapAmountData.data;

  reRouteOnboarding({
    type: data.type,
    applicationState: data.applicationState,
    state: swapAmountData.state,
  });

  const sendData = data;
  const assetIcon = sendData.icons[asset];
  const dstAssetIcon = sendData.icons[destinationAsset];
  const prices = sendData.tokenPrices;
  const assetPrice = prices[asset] && prices[asset].currentPrice;
  const xlmPrice = prices["native"]?.currentPrice;
  const dstAssetPrice = prices[destinationAsset]?.currentPrice;
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
  const supportsUsd = isMainnet(data.networkDetails) && assetPrice;
  const dstSupportsUsd = isMainnet(data.networkDetails) && dstAssetPrice;
  const dstPriceValueUsd = dstAssetPrice
    ? formatAmount(
        roundUsdValue(
          new BigNumber(dstAssetPrice)
            .multipliedBy(new BigNumber(cleanAmount(destinationAmount || "0")))
            .toString(),
        ),
      )
    : null;
  const availableBalance = getAvailableBalance({
    assetCanonical: asset,
    balances: sendData.userBalances.balances,
    recommendedFee: fee,
  });
  const displayTotal = `${formatAmount(availableBalance)}`;
  const isAmountTooHigh =
    (inputType === "crypto" &&
      new BigNumber(cleanAmount(formik.values.amount)).gt(
        new BigNumber(availableBalance),
      )) ||
    (inputType === "fiat" &&
      new BigNumber(cleanAmount(priceValue ?? "0")).gt(
        new BigNumber(availableBalance),
      ));

  const availableBalanceText = `${displayTotal} ${srcAsset.code} ${t("available")}`;
  const availableBalanceFontSizePx = AVAILABLE_BALANCE_FONT_SIZES.find(
    ({ maxLen }) => availableBalanceText.length <= maxLen,
  )!.sizePx;

  return (
    <>
      <SubviewHeader
        title={<span>{t("Swap")}</span>}
        hasBackButton
        customBackAction={goBack}
      />
      <View.Content
        contentFooter={
          <div className="SwapAsset__btn-continue">
            <div className="SwapAsset__settings-row">
              <div className="SwapAsset__settings-fee-display">
                <span className="SwapAsset__settings-fee-display__label">
                  {t("Fee")}:
                </span>
                <span>
                  {inputType === "crypto" ? `${fee} XLM` : recommendedFeeUsd}
                </span>
              </div>
              <div className="SwapAsset__settings-options">
                <Button
                  type="button"
                  size="md"
                  isRounded
                  variant="tertiary"
                  onClick={() => setIsEditingSlippage(true)}
                >
                  {`${t("Slippage")}: ${allowedSlippage}%`}
                </Button>
                <Button
                  type="button"
                  size="md"
                  isRounded
                  variant="tertiary"
                  onClick={() => setIsEditingSettings(true)}
                >
                  <Icon.Settings01 />
                </Button>
              </div>
            </div>
            <Button
              type="button"
              size="md"
              data-testid="swap-amount-btn-continue"
              isFullWidth
              isRounded
              variant="secondary"
              isLoading={simulationState.state === RequestState.LOADING}
              disabled={
                !destinationAsset ||
                (inputType === "crypto" &&
                  new BigNumber(formik.values.amount).isZero()) ||
                (inputType === "fiat" &&
                  new BigNumber(formik.values.amountUsd).isZero()) ||
                isAmountTooHigh
              }
              onClick={(e) => {
                e.preventDefault();
                formik.submitForm();
              }}
            >
              {!destinationAsset
                ? t("Select an asset")
                : new BigNumber(cleanAmount(formik.values.amount)).isZero()
                  ? t("Enter an amount")
                  : t("Review swap")}
            </Button>
          </div>
        }
      >
        <div className="SwapAsset">
          {showQuoteExpired && (
            <div
              className="SwapAsset__quote-expired"
              data-testid="swap-quote-expired"
            >
              <Notification
                variant="warning"
                title={t(
                  "Quote has expired, please try again to get a new quote",
                )}
              />
            </div>
          )}
          <div className="SwapAsset__content">
            <form>
              <div className="SwapAsset__simplebar__content">
                <div className="SwapAsset__cards" data-testid="swap-sell-card">
                  <AmountCard
                    label={t("You sell")}
                    availableBalanceText={availableBalanceText}
                    availableBalanceFontSizePx={availableBalanceFontSizePx}
                    inputType={inputType}
                    amount={formik.values.amount}
                    amountUsd={formik.values.amountUsd}
                    amountFontSizeClass={getAmountFontSizeClass()}
                    assetCode={srcAsset.code}
                    assetIcon={assetIcon}
                    assetIcons={
                      asset !== "native" ? { [asset]: assetIcon } : {}
                    }
                    assetIssuerKey={srcAsset.issuer}
                    supportsUsd={Boolean(supportsUsd)}
                    fiatLineText={
                      inputType === "crypto"
                        ? `$${priceValueUsd || "0.00"}`
                        : `${priceValue || "0"} ${srcAsset.code}`
                    }
                    isAmountTooHigh={isAmountTooHigh}
                    cryptoDecimals={assetDecimals}
                    onAmountChange={({ amount: newAmount }) => {
                      formik.setFieldValue("amount", newAmount);
                      dispatch(saveAmount(newAmount));
                    }}
                    onAmountUsdChange={({ amount: newAmount }) => {
                      formik.setFieldValue("amountUsd", newAmount);
                      dispatch(saveAmountUsd(newAmount));
                    }}
                    onToggleInputType={() => {
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
                    onSelectAsset={() => {
                      emitMetric(METRIC_NAMES.swapPickerOpened, {
                        side: "source",
                        source: "dropdown",
                      });
                      goToEditSrc();
                    }}
                  />
                </div>
                <div
                  className="SwapAsset__direction"
                  data-testid="swap-direction-chevron"
                >
                  <Button
                    size="md"
                    type="button"
                    isRounded
                    variant="tertiary"
                    onClick={(e) => {
                      e.preventDefault();
                      emitMetric(METRIC_NAMES.swapDirectionToggled);
                      const prevSrc = asset;
                      dispatch(saveAsset(destinationAsset));
                      dispatch(saveDestinationAsset(prevSrc));
                    }}
                  >
                    <Icon.ChevronDown />
                  </Button>
                </div>
                <div
                  className="SwapAsset__cards"
                  data-testid="swap-receive-card"
                >
                  <AmountCard
                    label={t("You receive")}
                    availableBalanceText=""
                    availableBalanceFontSizePx={availableBalanceFontSizePx}
                    inputType="crypto"
                    amount={destinationAmount}
                    amountUsd=""
                    amountFontSizeClass={getAmountFontSizeClass()}
                    assetCode={dstAsset ? dstAsset.code : ""}
                    assetIcon={dstAssetIcon}
                    assetIcons={
                      destinationAsset && destinationAsset !== "native"
                        ? { [destinationAsset]: dstAssetIcon }
                        : {}
                    }
                    assetIssuerKey={dstAsset?.issuer}
                    supportsUsd={Boolean(dstSupportsUsd)}
                    fiatLineText={`$${dstPriceValueUsd || "0.00"}`}
                    isAmountTooHigh={false}
                    isReadOnly
                    autoFocus={false}
                    cryptoDecimals={7}
                    onAmountChange={() => {}}
                    onAmountUsdChange={() => {}}
                    onToggleInputType={() => {}}
                    onSelectAsset={() => {
                      emitMetric(METRIC_NAMES.swapPickerOpened, {
                        side: "destination",
                        source: "dropdown",
                      });
                      goToEditDst();
                    }}
                  />
                </div>
                <div
                  className="SwapAsset__percentage-buttons"
                  data-testid="swap-percentage-buttons"
                >
                  <PercentageButtons
                    onSelect={(pct: number) => {
                      emitMetric(METRIC_NAMES.swapAmount);
                      const fraction = new BigNumber(pct).dividedBy(100);
                      if (inputType === "fiat" && assetPrice) {
                        const pctUsd = formatAmount(
                          roundUsdValue(
                            new BigNumber(assetPrice)
                              .multipliedBy(
                                new BigNumber(cleanAmount(availableBalance)),
                              )
                              .multipliedBy(fraction)
                              .toString(),
                          ),
                        );
                        formik.setFieldValue("amountUsd", pctUsd);
                        dispatch(saveAmountUsd(pctUsd));
                      } else {
                        const pctAmount = new BigNumber(
                          cleanAmount(availableBalance),
                        )
                          .multipliedBy(fraction)
                          .decimalPlaces(assetDecimals)
                          .toString();
                        formik.setFieldValue("amount", pctAmount);
                        dispatch(saveAmount(pctAmount));
                      }
                    }}
                  />
                </div>
              </div>
            </form>
          </div>
        </div>
      </View.Content>
      {isEditingSlippage ? (
        <>
          <div className="SlippageWrapper">
            <EditSlippage onClose={() => setIsEditingSlippage(false)} />
          </div>
          <LoadingBackground
            onClick={() => setIsEditingSlippage(false)}
            isActive={isEditingSlippage}
          />
        </>
      ) : null}
      {isEditingSettings ? (
        <>
          <div className="SlippageWrapper">
            <EditSettings
              fee={fee}
              defaultFee={recommendedFee}
              title={t("Swap Settings")}
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
      <SlideupModal
        setIsModalOpen={() => setIsReviewingTx(false)}
        isModalOpen={isReviewingTx}
      >
        {isReviewingTx ? (
          <ReviewTx
            assetIcon={assetIcon}
            fee={fee}
            networkDetails={networkDetails}
            onCancel={() => setIsReviewingTx(false)}
            onConfirm={() => {
              if (transactionData.destinationTokenDetails?.requiresTrustline) {
                emitMetric(METRIC_NAMES.swapTrustlineAdded, {
                  tokenCode: transactionData.destinationTokenDetails.tokenCode,
                  tokenIssuer: transactionData.destinationTokenDetails.issuer,
                });
              }
              goToNext();
            }}
            sendAmount={amount}
            sendPriceUsd={priceValueUsd}
            simulationState={simulationState}
            srcAsset={asset}
            dstAsset={{
              icon: dstAssetIcon,
              canonical: destinationAsset,
              priceUsd: simulationState.data?.dstAmountPriceUsd!,
              amount: destinationAmount,
            }}
            title={t("You are swapping")}
            destinationTokenDetails={transactionData.destinationTokenDetails}
            destMin={simulationState.data?.destMin}
          />
        ) : (
          <></>
        )}
      </SlideupModal>
      <SlideupModal
        setIsModalOpen={() => setIsXlmReserveOpen(false)}
        isModalOpen={isXlmReserveOpen}
      >
        {isXlmReserveOpen ? (
          <XlmReserveSheet
            onClose={() => setIsXlmReserveOpen(false)}
            publicKey={publicKey}
            canSwapForReserve={false}
            helpUrl=""
            onSwapForReserve={() => {
              dispatch(saveDestinationAsset("native"));
            }}
          />
        ) : (
          <></>
        )}
      </SlideupModal>
    </>
  );
};

interface EditSlippageProps {
  onClose: () => void;
}

const EditSlippage = ({ onClose }: EditSlippageProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { allowedSlippage } = useSelector(transactionDataSelector);

  let presetSlippage = "";
  let customSlippage = "";
  if (["1", "2", "3"].includes(allowedSlippage)) {
    presetSlippage = allowedSlippage;
  } else {
    customSlippage = allowedSlippage;
  }

  return (
    <Formik
      initialValues={{ presetSlippage, customSlippage }}
      onSubmit={(values) => {
        dispatch(
          saveAllowedSlippage(values.customSlippage || values.presetSlippage),
        );
        onClose();
      }}
      validationSchema={YupObject().shape({
        customSlippage: YupNumber()
          .min(0, `${t("must be at least")} 0%`)
          .max(10, `${t("must be below")} 10%`),
      })}
    >
      {({ setFieldValue, values, errors }) => (
        <Form
          className="View__contentAndFooterWrapper"
          data-testid="slippage-form"
        >
          <View.Content hasNoTopPadding>
            <div className="Slippage">
              <Card>
                <p>{t("Allowed Slippage")}</p>
                <div className="Slippage__cards">
                  {["1", "2", "3"].map((value) => (
                    <label key={value} className="Slippage--radio-label">
                      <Field
                        className="Slippage--radio-field"
                        name="presetSlippage"
                        type="radio"
                        value={value}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          setFieldValue("presetSlippage", e.target.value);
                          setFieldValue("customSlippage", "");
                          dispatch(saveAllowedSlippage(e.target.value));
                          onClose();
                        }}
                      />
                      <Card>{value}%</Card>
                    </label>
                  ))}
                </div>
                <div className="Slippage__custom-input">
                  <Field name="customSlippage">
                    {({ field }: FieldProps) => (
                      <Input
                        data-testid="custom-slippage-input"
                        fieldSize="md"
                        id="custom-input"
                        min={0}
                        max={10}
                        placeholder={`${t("Custom")} %`}
                        type="number"
                        {...field}
                        onChange={(e) => {
                          setFieldValue("customSlippage", e.target.value);
                          setFieldValue("presetSlippage", "");
                        }}
                        error={errors.customSlippage}
                      />
                    )}
                  </Field>
                </div>
                <div className="Slippage__Footer">
                  <Button
                    size="md"
                    isFullWidth
                    isRounded
                    variant="tertiary"
                    type="button"
                    onClick={() => {
                      setFieldValue("presetSlippage", defaultSlippage);
                      setFieldValue("customSlippage", "");
                    }}
                  >
                    {t("Set default")}
                  </Button>
                  <Button
                    size="md"
                    isFullWidth
                    isRounded
                    disabled={!values.presetSlippage && !values.customSlippage}
                    variant="secondary"
                    type="submit"
                  >
                    {t("Done")}
                  </Button>
                </div>
              </Card>
            </div>
          </View.Content>
        </Form>
      )}
    </Formik>
  );
};
