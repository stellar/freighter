import React from "react";
import { useSelector, useDispatch } from "react-redux";

import { Button, IconButton, Icon, Textarea } from "@stellar/design-system";

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

export const SendSettings = () => {
  const dispatch = useDispatch();
  const { transactionFee, memo } = useSelector(transactionDataSelector);

  return (
    <PopupWrapper>
      <BackButton />
      <div className="SendSettings">
        <div className="header">Send Settings</div>
        <Formik
          initialValues={{ memo }}
          onSubmit={(values) => {
            dispatch(saveMemo(values.memo));
          }}
        >
          <Form>
            <FormRows>
              <div className="SendSettings__row">
                <div className="SendSettings__row-left">
                  <span>Transaction fee</span>
                  <IconButton
                    type="button"
                    altText="info"
                    icon={<Icon.Info />}
                  />
                </div>
                <div className="SendSettings__row-right">
                  <span>{transactionFee}</span>
                  <div>
                    <button
                      className="SendSettings__nav-btn"
                      type="submit"
                      onClick={() => navigateTo(ROUTES.sendPaymentSettingsFee)}
                    >
                      <Icon.ChevronRight />
                    </button>
                  </div>
                </div>
              </div>
              <div className="SendSettings__row">
                <div className="SendSettings__row-left">
                  <span>Memo</span>{" "}
                  <IconButton
                    type="button"
                    altText="info"
                    icon={<Icon.Info />}
                  />
                </div>
                <div className="SendSettings__row-right">
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
              <div className="btn-continue">
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
        </Formik>
      </div>
    </PopupWrapper>
  );
};
