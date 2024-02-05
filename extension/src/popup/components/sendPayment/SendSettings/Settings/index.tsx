import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Formik, Form, Field, FieldProps } from "formik";
import { Icon, Textarea, Link, Button } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { isMuxedAccount } from "helpers/stellar";
import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { FormRows } from "popup/basics/Forms";
import { View } from "popup/basics/layout/View";
import {
  saveMemo,
  transactionDataSelector,
  isPathPaymentSelector,
  saveTransactionFee,
  saveSimulation,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { simulateTokenPayment } from "popup/ducks/token-payment";

import { InfoTooltip } from "popup/basics/InfoTooltip";
import { publicKeySelector } from "popup/ducks/accountServices";
import { parseTokenAmount } from "popup/helpers/soroban";
import "../../styles.scss";
import { Balances, TokenBalance } from "@shared/api/types";
import { getNetworkDetails } from "background/helpers/account";
import { AppDispatch } from "popup/App";

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
    destination,
    transactionFee,
    memo,
    allowedSlippage,
    isToken,
  } = useSelector(transactionDataSelector);
  const isPathPayment = useSelector(isPathPaymentSelector);
  const publicKey = useSelector(publicKeySelector);
  const { accountBalances } = useSelector(transactionSubmissionSelector);
  const isSwap = useIsSwap();
  const { recommendedFee } = useNetworkFees();

  // use default transaction fee if unset
  useEffect(() => {
    if (!transactionFee) {
      dispatch(saveTransactionFee(recommendedFee));
    }
  }, [dispatch, recommendedFee, transactionFee]);

  const handleTxFeeNav = () =>
    navigateTo(isSwap ? ROUTES.swapSettingsFee : ROUTES.sendPaymentSettingsFee);

  const handleSlippageNav = () =>
    navigateTo(
      isSwap ? ROUTES.swapSettingsSlippage : ROUTES.sendPaymentSettingsSlippage,
    );

  // dont show memo for regular sends to Muxed, or for swaps
  const showMemo = !isSwap && !isMuxedAccount(destination);
  const showSlippage = isPathPayment || isSwap;

  async function goToReview() {
    if (isToken) {
      const assetAddress = asset.split(":")[1];
      const balances =
        accountBalances.balances || ({} as NonNullable<Balances>);
      const assetBalance = balances[asset] as TokenBalance;

      if (!assetBalance) {
        throw new Error("Asset Balance not available");
      }

      const parsedAmount = parseTokenAmount(
        amount,
        Number(assetBalance.decimals),
      );

      const params = {
        publicKey,
        destination,
        amount: parsedAmount.toNumber(),
      };

      const networkDetails = await getNetworkDetails();
      const simulation = await dispatch(
        simulateTokenPayment({
          address: assetAddress,
          publicKey,
          memo,
          params,
          networkUrl: networkDetails.sorobanRpcUrl!,
          networkPassphrase: networkDetails.networkPassphrase,
        }),
      );

      if (simulateTokenPayment.fulfilled.match(simulation)) {
        dispatch(saveSimulation(simulation.payload));
        navigateTo(next);
      }
      return;
    }
    navigateTo(next);
  }

  return (
    <View data-testid="send-settings-view">
      <SubviewHeader
        title={`${isSwap ? t("Swap") : t("Send")} ${t("Settings")}`}
        customBackAction={() => navigateTo(previous)}
      />
      <Formik
        initialValues={{ memo }}
        onSubmit={(values) => {
          dispatch(saveMemo(values.memo));
        }}
      >
        {({ submitForm }) => (
          <Form className="View__contentAndFooterWrapper">
            <View.Content>
              <FormRows>
                {!isToken ? (
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
                ) : null}

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
                size="md"
                isFullWidth
                onClick={goToReview}
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
    </View>
  );
};
