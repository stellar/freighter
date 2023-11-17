import React, { useContext, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Address, XdrLargeInt } from "stellar-sdk";
import { Formik, Form, Field, FieldProps } from "formik";
import { Icon, Textarea, Link, Button } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { isMuxedAccount, xlmToStroop } from "helpers/stellar";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { FormRows } from "popup/basics/Forms";
import {
  saveMemo,
  transactionDataSelector,
  isPathPaymentSelector,
  saveTransactionFee,
  saveSimulation,
  tokensSelector,
} from "popup/ducks/transactionSubmission";

import { InfoTooltip } from "popup/basics/InfoTooltip";
import { transfer } from "@shared/helpers/soroban/token";
import { publicKeySelector } from "popup/ducks/accountServices";
import { parseTokenAmount } from "popup/helpers/soroban";
import { SorobanContext, hasSorobanClient } from "popup/SorobanContext";
import "../styles.scss";

export const SendSettings = ({
  previous,
  next,
}: {
  previous: ROUTES;
  next: ROUTES;
}) => {
  const sorobanClient = useContext(SorobanContext);
  const { t } = useTranslation();
  const dispatch = useDispatch();
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
  const { tokenBalances } = useSelector(tokensSelector);
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
      const assetBalance = tokenBalances.find(
        (b) => b.contractId === assetAddress,
      );

      if (!assetBalance) {
        throw new Error("Asset Balance not available");
      }

      if (!hasSorobanClient(sorobanClient)) {
        throw new Error("Soroban RPC not supported for this network");
      }

      const builder = await sorobanClient.newTxBuilder(
        xlmToStroop(transactionFee).toFixed(),
      );

      const parsedAmount = parseTokenAmount(
        amount,
        Number(assetBalance.decimals),
      );

      const params = [
        new Address(publicKey).toScVal(), // from
        new Address(destination).toScVal(), // to
        new XdrLargeInt("i128", parsedAmount.toNumber()).toI128(), // amount
      ];

      const transaction = transfer(assetAddress, params, memo, builder);
      const preflightSim = await sorobanClient.server.simulateTransaction(
        transaction,
      );

      if ("transactionData" in preflightSim) {
        dispatch(
          saveSimulation({
            response: preflightSim,
            raw: transaction,
          }),
        );
        navigateTo(next);
        return;
      }

      throw new Error(`Failed to simluate transaction, ID: ${preflightSim.id}`);
    }
    navigateTo(next);
  }

  return (
    <PopupWrapper>
      <div className="SendSettings" data-testid="send-settings-view">
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
            <Form>
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
                      <span>{transactionFee} XLM</span>
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
                      <span>{allowedSlippage}%</span>
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

                <div className="SendPayment__btn-continue">
                  <Button
                    size="md"
                    isFullWidth
                    type="submit"
                    variant="secondary"
                    onClick={goToReview}
                    data-testid="send-settings-btn-continue"
                  >
                    {t("Review")} {isSwap ? t("Swap") : t("Send")}
                  </Button>
                </div>
              </FormRows>
            </Form>
          )}
        </Formik>
      </div>
    </PopupWrapper>
  );
};
