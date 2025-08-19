import React, { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useLocation } from "react-router-dom";
import BigNumber from "bignumber.js";
import { useFormik } from "formik";
import { Button, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { LoadingBackground } from "popup/basics/LoadingBackground";
import { View } from "popup/basics/layout/View";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { AppDispatch } from "popup/App";
import {
  getAssetFromCanonical,
  isMainnet,
  truncatedFedAddress,
  truncatedPublicKey,
} from "helpers/stellar";
import { NetworkCongestion } from "popup/helpers/useNetworkFees";
import { emitMetric } from "helpers/metrics";
import { useRunAfterUpdate } from "popup/helpers/useRunAfterUpdate";
import { getAssetDecimals, getAvailableBalance } from "popup/helpers/soroban";
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
  saveMemo,
  saveTransactionFee,
  saveTransactionTimeout,
  saveAmountUsd,
} from "popup/ducks/transactionSubmission";
import { Loading } from "popup/components/Loading";
import { TX_SEND_MAX } from "popup/constants/transaction";
import { findAssetBalance } from "popup/helpers/balance";

import { RequestState, State } from "constants/request";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { AMOUNT_ERROR, InputType } from "helpers/transaction";
import { reRouteOnboarding } from "popup/helpers/route";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { EditSettings } from "popup/components/InternalTransaction/EditSettings";
import { EditMemo } from "popup/components/InternalTransaction/EditMemo";
import { ReviewTx } from "popup/components/InternalTransaction/ReviewTransaction";

import { AppDataType } from "helpers/hooks/useGetAppData";
import { useGetSendAmountData } from "./hooks/useSendAmountData";
import { SimulateTxData } from "./hooks/useSimulateTxData";
import { SlideupModal } from "popup/components/SlideupModal";

import "../styles.scss";

export const SendAmount = ({
  goBack,
  goToNext,
  goToChooseDest,
  simulationState,
  fetchSimulationData,
  networkCongestion,
  recommendedFee,
}: {
  goBack: () => void;
  goToNext: () => void;
  goToChooseDest: () => void;
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
  const {
    amount,
    amountUsd,
    asset,
    destination,
    destinationAsset,
    federationAddress,
    isToken,
    transactionFee,
  } = transactionData;
  const fee = transactionFee || recommendedFee;

  const { state: sendAmountData, fetchData } = useGetSendAmountData(
    {
      showHidden: false,
      includeIcons: true,
    },
    destination,
  );

  const cryptoInputRef = useRef<HTMLInputElement>(null);
  const usdInputRef = useRef<HTMLInputElement>(null);

  const [inputType, setInputType] = useState<InputType>("crypto");
  const [isEditingMemo, setIsEditingMemo] = React.useState(false);
  const [isEditingSettings, setIsEditingSettings] = React.useState(false);
  const [isReviewingTx, setIsReviewingTx] = React.useState(false);

  const handleContinue = async () => {
    const amount = inputType === "crypto" ? formik.values.amount : priceValue!;
    dispatch(saveAmount(cleanAmount(amount)));
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
    subentryCount: sendData.userBalances.subentryCount,
  });
  const displayTotal =
    "decimals" in assetBalance
      ? availableBalance
      : formatAmount(availableBalance);
  const srcTitle = srcAsset.code;
  const goBackAction = () => {
    dispatch(saveAsset("native"));
    dispatch(saveAmount("0"));
    dispatch(saveAmountUsd("0.00"));
    goBack();
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
                <span>
                  {inputType === "crypto" ? `${fee} XLM` : recommendedFeeUsd}
                </span>
              </div>
              <div className="SendAmount__settings-options">
                <Button
                  size="md"
                  isRounded
                  variant="tertiary"
                  onClick={() => setIsEditingMemo(true)}
                  icon={<Icon.File02 />}
                  iconPosition="left"
                >
                  {t("Memo")}
                </Button>
                <Button
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
              size="lg"
              disabled={
                (inputType === "crypto" &&
                  new BigNumber(formik.values.amount).isZero()) ||
                (inputType === "fiat" &&
                  new BigNumber(formik.values.amountUsd).isZero()) ||
                isAmountTooHigh
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
                        <input
                          ref={cryptoInputRef}
                          className={`SendAmount__input-amount SendAmount__${getAmountFontSize()}`}
                          style={{
                            width: `${formik.values.amount.length + 1 || 5}ch`,
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
                        <input
                          ref={usdInputRef}
                          className={`SendAmount__input-amount SendAmount__${getAmountFontSize()}`}
                          style={{
                            width: `${formik.values.amountUsd.length || 5}ch`,
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
                        You don't have enough {parsedSourceAsset.code} in your
                        account
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
                  onClick={goBackAction}
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
                <div
                  className="SendAmount__EditDestination"
                  onClick={() => {
                    dispatch(saveAsset("native"));
                    dispatch(saveAmount("0"));
                    dispatch(saveAmountUsd("0.00"));
                    goToChooseDest();
                  }}
                >
                  <div className="SendAmount__EditDestination__title">
                    <div className="SendAmount__EditDestination__identicon">
                      <IdenticonImg publicKey={destination} />
                    </div>
                    {federationAddress
                      ? truncatedFedAddress(federationAddress)
                      : truncatedPublicKey(destination)}
                  </div>
                  <Button isRounded size="sm" variant="tertiary">
                    <Icon.ChevronRight />
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
              fee={fee}
              title="Send Settings"
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
            networkDetails={sendAmountData.data?.networkDetails!}
            onCancel={() => setIsReviewingTx(false)}
            onConfirm={goToNext}
            sendAmount={amount}
            sendPriceUsd={priceValueUsd}
            simulationState={simulationState}
            srcAsset={asset}
            title="You are sending"
          />
        ) : (
          <></>
        )}
      </SlideupModal>
    </React.Fragment>
  );
};
