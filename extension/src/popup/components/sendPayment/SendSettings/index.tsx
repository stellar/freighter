import React from "react";
import { useSelector, useDispatch } from "react-redux";

import { Icon, Textarea, DetailsTooltip } from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { FormRows } from "popup/basics/Forms";
import {
  saveMemo,
  transactionDataSelector,
  isPathPaymentSelector,
} from "popup/ducks/transactionSubmission";

import { Formik, Form, Field, FieldProps } from "formik";

import "../styles.scss";

export const SendSettings = ({ previous }: { previous: ROUTES }) => {
  const dispatch = useDispatch();
  const { destination, transactionFee, memo, allowedSlippage } = useSelector(
    transactionDataSelector,
  );
  const isPathPayment = useSelector(isPathPaymentSelector);

  return (
    <PopupWrapper>
      <div className="SendSettings">
        <SubviewHeader
          title="Send Settings"
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
                    {/* TODO - add copy */}
                    <DetailsTooltip details="">
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
                          navigateTo(ROUTES.sendPaymentSettingsFee);
                        }}
                      >
                        <Icon.ChevronRight />
                      </div>
                    </div>
                  </div>
                </div>
                {isPathPayment && (
                  <div className="SendSettings__row">
                    <div className="SendSettings__row__left">
                      <span className="SendSettings__row__title">
                        Allowed slippage
                      </span>
                      {/* TODO - add copy */}
                      <DetailsTooltip details="">
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
                            navigateTo(ROUTES.sendPaymentSettingsSlippage);
                          }}
                        >
                          <Icon.ChevronRight />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {!destination.startsWith("M") && (
                  <>
                    <div className="SendSettings__row">
                      <div className="SendSettings__row__left">
                        <span className="SendSettings__row__title">Memo</span>{" "}
                        {/* TODO - add copy */}
                        <DetailsTooltip details="">
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
                    onClick={() => navigateTo(ROUTES.sendPaymentConfirm)}
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
