import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Form, Field, FieldProps, Formik, useFormik } from "formik";
import BigNumber from "bignumber.js";
import { object as YupObject, number as YupNumber } from "yup";
import { Button, Card, Icon, Input } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { useRunAfterUpdate } from "popup/helpers/useRunAfterUpdate";
import {
  saveAllowedSlippage,
  saveAmount,
  saveAmountUsd,
  saveAsset,
  saveTransactionFee,
  saveTransactionTimeout,
  transactionDataSelector,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import {
  cleanAmount,
  formatAmount,
  formatAmountPreserveCursor,
  roundUsdValue,
} from "popup/helpers/formatters";
import { TX_SEND_MAX } from "popup/constants/transaction";
import { useGetSwapAmountData } from "./hooks/useGetSwapAmountData";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import { findAssetBalance } from "popup/helpers/balance";
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
import { AssetTile } from "popup/components/AssetTile";

import "./styles.scss";

const defaultSlippage = "1";
const DEFAULT_INPUT_WIDTH = 25;

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
  const runAfterUpdate = useRunAfterUpdate();
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
  const { state: simulationState, fetchData: fetchSimulationData } =
    useSimulateTxData({
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
  const cryptoInputRef = useRef<HTMLInputElement>(null);
  const usdInputRef = useRef<HTMLInputElement>(null);

  const [inputWidthCrypto, setInputWidthCrypto] = useState(0);
  const setCryptoSpan = (el: HTMLSpanElement | null) => {
    if (el) {
      const width = el.offsetWidth + 4;
      setInputWidthCrypto(Math.max(DEFAULT_INPUT_WIDTH, width));
    }
  };

  const [inputWidthFiat, setInputWidthFiat] = useState(0);
  const setFiatSpan = (el: HTMLSpanElement | null) => {
    if (el) {
      const width = el.offsetWidth + 2;
      setInputWidthFiat(Math.max(DEFAULT_INPUT_WIDTH, width));
    }
  };

  const [isEditingSlippage, setIsEditingSlippage] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isReviewingTx, setIsReviewingTx] = React.useState(false);

  const handleContinue = async (values: { amount: string }) => {
    const amount = inputType === "crypto" ? values.amount : priceValue!;
    const cleanedAmount = cleanAmount(amount);
    dispatch(saveAmount(cleanedAmount));
    await fetchSimulationData({
      amount: cleanedAmount,
      destinationRate: dstAssetPrice,
    });
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
    initialValues: { amount, amountUsd, asset, destinationAsset },
    onSubmit: handleContinue,
    validate,
    enableReinitialize: true,
    validateOnChange: true,
  });

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

  const parsedSourceAsset = getAssetFromCanonical(formik.values.asset);
  const isLoading =
    swapAmountData.state === RequestState.IDLE ||
    swapAmountData.state === RequestState.LOADING;

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

  if (isLoading) {
    return <Loading />;
  }

  const hasError = swapAmountData.state === RequestState.ERROR;
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

  if (!hasError) {
    reRouteOnboarding({
      type: swapAmountData.data.type,
      applicationState: swapAmountData.data.applicationState,
      state: swapAmountData.state,
    });
  }

  const sendData = swapAmountData.data!;
  const assetIcon = sendData.icons[asset];
  const dstAssetIcon = sendData.icons[destinationAsset];
  const dstAssetBalance = dstAsset
    ? findAssetBalance(sendData.userBalances.balances, dstAsset)
    : null;
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
  const supportsUsd =
    isMainnet(swapAmountData.data?.networkDetails!) && assetPrice;
  const availableBalance = getAvailableBalance({
    assetCanonical: asset,
    balances: sendData.userBalances.balances,
    recommendedFee: fee,
  });
  const displayTotal = `${formatAmount(availableBalance)}`;
  const dstDisplayTotal =
    dstAssetBalance && dstAsset
      ? `${formatAmount(dstAssetBalance.total.toString())}`
      : "0";
  const isAmountTooHigh =
    (inputType === "crypto" &&
      new BigNumber(cleanAmount(formik.values.amount)).gt(
        new BigNumber(availableBalance),
      )) ||
    (inputType === "fiat" &&
      new BigNumber(cleanAmount(priceValue!)).gt(
        new BigNumber(availableBalance),
      ));

  const goToEditSrcAction = () => {
    dispatch(saveAsset("native"));
    dispatch(saveAmount("0"));
    dispatch(saveAmountUsd("0.00"));
    goToEditSrc();
  };

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
                  Fee:
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
                  {`Slippage: ${allowedSlippage}%`}
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
                !!destinationAsset &&
                ((inputType === "crypto" &&
                  new BigNumber(formik.values.amount).isZero()) ||
                  (inputType === "fiat" &&
                    new BigNumber(formik.values.amountUsd).isZero()) ||
                  isAmountTooHigh)
              }
              onClick={(e) => {
                e.preventDefault();
                if (destinationAsset) {
                  formik.submitForm();
                  return;
                }
                goToNext();
              }}
            >
              {destinationAsset ? t("Review swap") : t("Select an asset")}
            </Button>
          </div>
        }
      >
        <div className="SwapAsset">
          <div className="SwapAsset__content">
            <form>
              <div className="SwapAsset__simplebar__content">
                <div className="SwapAsset__amount-row">
                  <div className="SwapAsset__amount-input-container">
                    {inputType === "crypto" && (
                      <>
                        <span
                          ref={setCryptoSpan}
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
                          className={`SwapAsset__input-amount SwapAsset__${getAmountFontSize()}`}
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
                          className={`SwapAsset__amount-label SwapAsset__${getAmountFontSize()}`}
                        >
                          {parsedSourceAsset.code}
                        </div>
                      </>
                    )}
                    {inputType === "fiat" && (
                      <>
                        <div
                          className={`SwapAsset__amount-label-usd SwapAsset__${getAmountFontSize()}`}
                        >
                          $
                        </div>
                        <span
                          ref={setFiatSpan}
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
                          className={`SwapAsset__input-amount SwapAsset__${getAmountFontSize()}`}
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
                  <div className="SwapAsset__amount-price">
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
                <div className="SwapAsset__invalid-state">
                  {isAmountTooHigh && (
                    <>
                      <Icon.AlertCircle />
                      <span>
                        You don't have enough {parsedSourceAsset.code} in your
                        account
                      </span>
                    </>
                  )}
                </div>
                <div className="SwapAsset__btn-set-max">
                  <Button
                    size="md"
                    type="button"
                    variant="tertiary"
                    isRounded
                    onClick={(e) => {
                      e.preventDefault();
                      emitMetric(METRIC_NAMES.swapAmount);
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
                    data-testid="SwapAssetSetMax"
                  >
                    {t("Set Max")}
                  </Button>
                </div>
                <AssetTile
                  isSuspicious={false}
                  asset={{
                    code: srcAsset.code,
                    canonical: asset,
                    issuer: srcAsset.issuer,
                  }}
                  assetIcon={assetIcon}
                  balance={displayTotal}
                  onClick={goToEditSrcAction}
                  emptyLabel={t("Send")}
                  testId="swap-src-asset-tile"
                />
                <AssetTile
                  isSuspicious={false}
                  asset={
                    dstAsset
                      ? {
                          code: dstAsset.code,
                          canonical: destinationAsset,
                          issuer: dstAsset.issuer,
                        }
                      : null
                  }
                  assetIcon={dstAssetIcon}
                  balance={dstDisplayTotal}
                  onClick={goToEditDst}
                  emptyLabel={t("Receive")}
                  testId="swap-dst-asset-tile"
                />
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
            onConfirm={goToNext}
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
