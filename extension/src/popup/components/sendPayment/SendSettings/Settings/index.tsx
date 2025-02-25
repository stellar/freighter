import React, { useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Formik, Form, Field, FieldProps } from "formik";
import { Icon, Textarea, Link, Button, Loader } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Asset } from "stellar-sdk";

import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { getNativeContractDetails } from "popup/helpers/searchAsset";
import {
  isMuxedAccount,
  getAssetFromCanonical,
  isMainnet,
} from "helpers/stellar";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { FormRows } from "popup/basics/Forms";
import { View } from "popup/basics/layout/View";
import {
  saveMemo,
  transactionDataSelector,
  isPathPaymentSelector,
} from "popup/ducks/transactionSubmission";

import { InfoTooltip } from "popup/basics/InfoTooltip";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { isContractId } from "popup/helpers/soroban";
import { AppDispatch } from "popup/App";

import { RequestState } from "constants/request";
import { useGetSettingsData } from "./hooks/useGetSettingsData";

import "../../styles.scss";

function getSimulationMode(
  isSoroswap: boolean,
  isToken: boolean,
  isSendSacToContract: boolean,
) {
  if (isSoroswap) {
    return "Soroswap";
  }
  if (isToken || isSendSacToContract) {
    return "TokenPayment";
  }
  return "ClassicPayment";
}

export const Settings = ({
  previous,
  next,
}: {
  previous: ROUTES;
  next: ROUTES;
}) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const {
    asset,
    amount,
    decimals,
    destination,
    destinationAmount,
    destinationDecimals,
    transactionFee,
    transactionTimeout,
    memo,
    allowedSlippage,
    isToken,
    isSoroswap,
    path,
  } = useSelector(transactionDataSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const isPathPayment = useSelector(isPathPaymentSelector);
  const publicKey = useSelector(publicKeySelector);
  const isSwap = useIsSwap();
  const { recommendedFee } = useNetworkFees();

  const isSendSacToContract =
    isContractId(destination) &&
    !isContractId(getAssetFromCanonical(asset).issuer);
  const simulationMode = getSimulationMode(
    isSoroswap,
    isToken,
    isSendSacToContract,
  );
  const getSacContractAddress = useCallback(() => {
    if (asset === "native") {
      return getNativeContractDetails(networkDetails).contract;
    }

    const assetFromCanonical = new Asset(
      getAssetFromCanonical(asset).code,
      getAssetFromCanonical(asset).issuer,
    );
    const contractAddress = assetFromCanonical.contractId(
      networkDetails.networkPassphrase,
    );

    return contractAddress;
  }, [asset, networkDetails]);
  const assetAddress = isSendSacToContract
    ? getSacContractAddress()
    : asset.split(":")[1];
  const { state: settingsData, fetchData } = useGetSettingsData(
    publicKey,
    networkDetails,
    simulationMode,
    recommendedFee,
    {
      isMainnet: isMainnet(networkDetails),
      showHidden: false,
      includeIcons: true,
    },
    {
      amountIn: amount,
      amountInDecimals: decimals || 0,
      amountOut: destinationAmount,
      amountOutDecimals: destinationDecimals || 0,
      memo,
      transactionFee,
      path,
    },
    {
      address: assetAddress,
      amount,
      publicKey,
      memo,
      params: {
        asset: isSendSacToContract
          ? getSacContractAddress()
          : asset.split(":")[1],
        publicKey,
        destination,
      },
      networkDetails,
      transactionFee,
    },
  );

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTxFeeNav = () =>
    navigateTo(isSwap ? ROUTES.swapSettingsFee : ROUTES.sendPaymentSettingsFee);

  const handleSlippageNav = () =>
    navigateTo(
      isSwap ? ROUTES.swapSettingsSlippage : ROUTES.sendPaymentSettingsSlippage,
    );

  const handleTimeoutNav = () =>
    navigateTo(
      isSwap ? ROUTES.swapSettingsTimeout : ROUTES.sendPaymentSettingsTimeout,
    );

  // dont show memo for regular sends to Muxed, or for swaps
  const showMemo = !isSwap && !isMuxedAccount(destination);
  const showSlippage = (isPathPayment || isSwap) && !isSoroswap;
  const isLoading =
    settingsData.state === RequestState.IDLE ||
    settingsData.state === RequestState.LOADING;

  return (
    <React.Fragment>
      <SubviewHeader
        title={`${isSwap ? t("Swap") : t("Send")} ${t("Settings")}`}
        customBackAction={() => navigateTo(previous)}
      />
      {isLoading ? (
        <div className="SendSettings__loadingWrapper">
          <Loader size="2rem" />
        </div>
      ) : (
        <Formik
          initialValues={{ memo }}
          onSubmit={(values) => {
            dispatch(saveMemo(values.memo));
          }}
        >
          {({ submitForm }) => (
            <Form className="View__contentAndFooterWrapper">
              <View.Content hasNoTopPadding>
                <FormRows>
                  <div className="SendSettings__row">
                    <div className="SendSettings__row__left">
                      <InfoTooltip
                        infoText={
                          <span>
                            {t("Maximum network transaction fee to be paid")}{" "}
                            <Link
                              variant="secondary"
                              href="https://developers.stellar.org/docs/glossary/fees/#base-fee"
                              rel="noreferrer"
                              target="_blank"
                            >
                              {t("Learn more")}
                            </Link>
                          </span>
                        }
                        placement="bottom"
                      >
                        <span
                          className="SendSettings__row__title SendSettings__clickable"
                          onClick={() => {
                            submitForm();
                            handleTxFeeNav();
                          }}
                        >
                          {t("Transaction fee")}
                        </span>
                      </InfoTooltip>
                    </div>
                    <div
                      className="SendSettings__row__right SendSettings__clickable"
                      onClick={() => {
                        submitForm();
                        handleTxFeeNav();
                      }}
                    >
                      <span data-testid="SendSettingsTransactionFee">
                        {transactionFee} XLM
                      </span>
                      <div>
                        <Icon.ChevronRight />
                      </div>
                    </div>
                  </div>

                  <div className="SendSettings__row">
                    <div className="SendSettings__row__left">
                      <InfoTooltip
                        infoText={
                          <span>
                            {t(
                              "Number of seconds that can pass before this transaction can no longer be accepted by the network",
                            )}{" "}
                          </span>
                        }
                        placement="bottom"
                      >
                        <span
                          className="SendSettings__row__title SendSettings__clickable"
                          onClick={() => {
                            submitForm();
                            handleTimeoutNav();
                          }}
                        >
                          {t("Transaction timeout")}
                        </span>
                      </InfoTooltip>
                    </div>
                    <div
                      className="SendSettings__row__right SendSettings__clickable"
                      onClick={() => {
                        submitForm();
                        handleTimeoutNav();
                      }}
                    >
                      <span data-testid="SendSettingsTransactionTimeout">
                        {transactionTimeout}(s)
                      </span>
                      <div>
                        <Icon.ChevronRight />
                      </div>
                    </div>
                  </div>

                  {showSlippage && (
                    <div className="SendSettings__row">
                      <div className="SendSettings__row__left">
                        <InfoTooltip
                          infoText={
                            <span>
                              {t(
                                "Allowed downward variation in the destination amount",
                              )}{" "}
                              <Link
                                variant="secondary"
                                href="https://www.freighter.app/faq"
                                rel="noreferrer"
                                target="_blank"
                              >
                                {t("Learn more")}
                              </Link>
                            </span>
                          }
                          placement="bottom"
                        >
                          <span
                            className="SendSettings__row__title SendSettings__clickable"
                            onClick={() => {
                              submitForm();
                              handleSlippageNav();
                            }}
                          >
                            {t("Allowed slippage")}
                          </span>
                        </InfoTooltip>
                      </div>
                      <div
                        className="SendSettings__row__right SendSettings__clickable"
                        onClick={() => {
                          submitForm();
                          handleSlippageNav();
                        }}
                      >
                        <span data-testid="SendSettingsAllowedSlippage">
                          {allowedSlippage}%
                        </span>
                        <div>
                          <Icon.ChevronRight />
                        </div>
                      </div>
                    </div>
                  )}
                  {showMemo && (
                    <>
                      <div className="SendSettings__row">
                        <div className="SendSettings__row__left">
                          <InfoTooltip
                            infoText={
                              <span>
                                {t("Include a custom memo to this transaction")}{" "}
                                <Link
                                  variant="secondary"
                                  href="https://developers.stellar.org/docs/glossary/transactions/#memo"
                                  rel="noreferrer"
                                  target="_blank"
                                >
                                  {t("Learn more")}
                                </Link>
                              </span>
                            }
                            placement="bottom"
                          >
                            <span className="SendSettings__row__title">
                              {t("Memo")}
                            </span>
                          </InfoTooltip>
                        </div>
                        <div className="SendSettings__row__right">
                          <span></span>
                        </div>
                      </div>
                      <Field name="memo">
                        {({ field }: FieldProps) => (
                          <Textarea
                            fieldSize="md"
                            id="mnemonic-input"
                            placeholder={t("Memo (optional)")}
                            {...field}
                          />
                        )}
                      </Field>
                    </>
                  )}
                </FormRows>
              </View.Content>
              <View.Footer>
                <Button
                  disabled={!transactionFee}
                  size="md"
                  isFullWidth
                  onClick={() => navigateTo(next)}
                  type="submit"
                  variant="secondary"
                  data-testid="send-settings-btn-continue"
                >
                  {t("Review")} {isSwap ? t("Swap") : t("Send")}
                </Button>
              </View.Footer>
            </Form>
          )}
        </Formik>
      )}
    </React.Fragment>
  );
};
