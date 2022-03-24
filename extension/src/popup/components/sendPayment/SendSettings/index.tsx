import React from "react";
import { useSelector, useDispatch } from "react-redux";

import { Button, Icon, Textarea, DetailsTooltip } from "@stellar/design-system";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { BackButton } from "popup/basics/BackButton";
import { FormRows } from "popup/basics/Forms";
import {
  saveMemo,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";

import { Formik, Form, Field, FieldProps } from "formik";

import "../styles.scss";

export const SendSettings = ({ previous }: { previous: ROUTES }) => {
  const dispatch = useDispatch();
  const { destination, transactionFee, memo } = useSelector(
    transactionDataSelector,
  );

  return (
    <PopupWrapper>
      <BackButton customBackAction={() => navigateTo(previous)} />
      <div className="SendSettings">
        <div className="SendPayment__header">Send Settings</div>
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
                        <div className="SendSettings__input-textarea">
                          <Textarea
                            // className="TextArea Card Card--highlight"
                            // autoComplete="off"
                            id="mnemonic-input"
                            placeholder="Memo (optional)"
                            {...field}
                          />
                        </div>
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
