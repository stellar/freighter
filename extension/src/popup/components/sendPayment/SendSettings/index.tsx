import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Formik, Form, Field, FieldProps } from "formik";
import {
  Icon,
  Textarea,
  DetailsTooltip,
  TextLink,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { isMuxedAccount } from "helpers/stellar";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { FormRows } from "popup/basics/Forms";
import {
  saveMemo,
  transactionDataSelector,
  isPathPaymentSelector,
  saveTransactionFee,
} from "popup/ducks/transactionSubmission";

import "../styles.scss";

export const SendSettings = ({
  previous,
  next,
}: {
  previous: ROUTES;
  next: ROUTES;
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const {
    destination,
    transactionFee,
    memo,
    allowedSlippage,
    isToken,
  } = useSelector(transactionDataSelector);
  const isPathPayment = useSelector(isPathPaymentSelector);
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
                      <span
                        className="SendSettings__row__title SendSettings__clickable"
                        onClick={() => {
                          submitForm();
                          handleTxFeeNav();
                        }}
                      >
                        {t("Transaction fee")}
                      </span>
                      <DetailsTooltip
                        tooltipPosition={DetailsTooltip.tooltipPosition.BOTTOM}
                        details={
                          <span>
                            {t("Maximum network transaction fee to be paid")}{" "}
                            <TextLink
                              variant={TextLink.variant.secondary}
                              href="https://developers.stellar.org/docs/glossary/fees/#base-fee"
                              rel="noreferrer"
                              target="_blank"
                            >
                              {t("Learn more")}
                            </TextLink>
                          </span>
                        }
                      >
                        <span></span>
                      </DetailsTooltip>
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
                      <span
                        className="SendSettings__row__title SendSettings__clickable"
                        onClick={() => {
                          submitForm();
                          handleSlippageNav();
                        }}
                      >
                        {t("Allowed slippage")}
                      </span>
                      <DetailsTooltip
                        tooltipPosition={DetailsTooltip.tooltipPosition.BOTTOM}
                        details={
                          <span>
                            {t(
                              "Allowed downward variation in the destination amount",
                            )}{" "}
                            <TextLink
                              variant={TextLink.variant.secondary}
                              href="https://www.freighter.app/faq"
                              rel="noreferrer"
                              target="_blank"
                            >
                              {t("Learn more")}
                            </TextLink>
                          </span>
                        }
                      >
                        <span></span>
                      </DetailsTooltip>
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
                        <span className="SendSettings__row__title">
                          {t("Memo")}
                        </span>{" "}
                        <DetailsTooltip
                          tooltipPosition={
                            DetailsTooltip.tooltipPosition.BOTTOM
                          }
                          details={
                            <span>
                              {t("Include a custom memo to this transaction")}{" "}
                              <TextLink
                                variant={TextLink.variant.secondary}
                                href="https://developers.stellar.org/docs/glossary/transactions/#memo"
                                rel="noreferrer"
                                target="_blank"
                              >
                                {t("Learn more")}
                              </TextLink>
                            </span>
                          }
                        >
                          <span></span>
                        </DetailsTooltip>
                      </div>
                      <div className="SendSettings__row__right">
                        <span></span>
                      </div>
                    </div>
                    <Field name="memo">
                      {({ field }: FieldProps) => (
                        <Textarea
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
                    fullWidth
                    type="submit"
                    variant={Button.variant.tertiary}
                    onClick={() => navigateTo(next)}
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
