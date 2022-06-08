import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Formik, Form, Field, FieldProps } from "formik";
import {
  Icon,
  Textarea,
  DetailsTooltip,
  TextLink,
} from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { useIsSwap } from "popup/helpers/useIsSwap";
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
  const dispatch = useDispatch();
  const { destination, transactionFee, memo, allowedSlippage } = useSelector(
    transactionDataSelector,
  );
  const isPathPayment = useSelector(isPathPaymentSelector);
  const isSwap = useIsSwap();
  const { recommendedFee } = useNetworkFees();

  // use default transaction fee if unset
  useEffect(() => {
    if (!transactionFee) {
      dispatch(saveTransactionFee(recommendedFee));
    }
  }, [dispatch, recommendedFee, transactionFee]);

  // dont show memo for regular sends to Muxed, or for swaps
  const showMemo = !isSwap && !destination.startsWith("M");
  const showSlippage = isPathPayment || isSwap;

  return (
    <PopupWrapper>
      <div className="SendSettings">
        <SubviewHeader
          title={`${isSwap ? "Swap" : "Send"} Settings`}
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
                <div className="SendSettings__row">
                  <div className="SendSettings__row__left">
                    <span className="SendSettings__row__title">
                      Transaction fee
                    </span>
                    <DetailsTooltip
                      tooltipPosition={DetailsTooltip.tooltipPosition.BOTTOM}
                      details={
                        <span>
                          Maximum network transaction fee to be paid{" "}
                          <TextLink
                            variant={TextLink.variant.secondary}
                            href="https://developers.stellar.org/docs/glossary/fees/#base-fee"
                            rel="noreferrer"
                            target="_blank"
                          >
                            Learn more
                          </TextLink>
                        </span>
                      }
                    >
                      <span></span>
                    </DetailsTooltip>
                  </div>
                  <div className="SendSettings__row__right">
                    <span>{transactionFee} XLM</span>
                    <div>
                      <div
                        className="SendSettings__nav-btn"
                        onClick={() => {
                          submitForm();
                          navigateTo(
                            isSwap
                              ? ROUTES.swapSettingsFee
                              : ROUTES.sendPaymentSettingsFee,
                          );
                        }}
                      >
                        <Icon.ChevronRight />
                      </div>
                    </div>
                  </div>
                </div>
                {showSlippage && (
                  <div className="SendSettings__row">
                    <div className="SendSettings__row__left">
                      <span className="SendSettings__row__title">
                        Allowed slippage
                      </span>
                      <DetailsTooltip
                        tooltipPosition={DetailsTooltip.tooltipPosition.BOTTOM}
                        details={
                          <span>
                            Allowed downward variation in the destination amount{" "}
                            <TextLink
                              variant={TextLink.variant.secondary}
                              href="https://www.freighter.app/faq"
                              rel="noreferrer"
                              target="_blank"
                            >
                              Learn more
                            </TextLink>
                          </span>
                        }
                      >
                        <span></span>
                      </DetailsTooltip>
                    </div>
                    <div className="SendSettings__row__right">
                      <span>{allowedSlippage}%</span>
                      <div>
                        <div
                          className="SendSettings__nav-btn"
                          onClick={() => {
                            submitForm();
                            navigateTo(
                              isSwap
                                ? ROUTES.swapSettingsSlippage
                                : ROUTES.sendPaymentSettingsSlippage,
                            );
                          }}
                        >
                          <Icon.ChevronRight />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {showMemo && (
                  <>
                    <div className="SendSettings__row">
                      <div className="SendSettings__row__left">
                        <span className="SendSettings__row__title">Memo</span>{" "}
                        <DetailsTooltip
                          tooltipPosition={
                            DetailsTooltip.tooltipPosition.BOTTOM
                          }
                          details={
                            <span>
                              Include a custom memo to this transaction{" "}
                              <TextLink
                                variant={TextLink.variant.secondary}
                                href="https://developers.stellar.org/docs/glossary/transactions/#memo"
                                rel="noreferrer"
                                target="_blank"
                              >
                                Learn more
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
                          placeholder="Memo (optional)"
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
                  >
                    Review Send
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
