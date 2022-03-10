import React from "react";

import { Button, IconButton, Icon } from "@stellar/design-system";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";

import { PopupWrapper } from "popup/basics/PopupWrapper";

import { BackButton } from "popup/basics/BackButton";

import "../styles.scss";

export const SendSettings = ({
  transactionFee,
  setTransactionFee,
  memo,
  setMemo,
}: {
  transactionFee: string;
  setTransactionFee: (state: string) => void;
  memo: string;
  setMemo: (state: string) => void;
}) => (
  <PopupWrapper>
    <BackButton hasBackCopy />
    <div className="SendSettings">
      <div className="header">Send Settings</div>
      <div className="SendSettings__row">
        <div className="SendSettings__row-left">
          <span>Transaction fee</span>
          <IconButton altText="info" icon={<Icon.Info />} />
        </div>
        <div className="SendSettings__row-right">
          <span>{transactionFee}</span>
          <div>
            <div
              className="SendSettings__nav-btn"
              onClick={() => navigateTo(ROUTES.sendPaymentSettingsFee)}
            >
              <Icon.ChevronRight />
            </div>
          </div>
        </div>
      </div>
      <div className="SendSettings__row">
        <div className="SendSettings__row-left">
          <span>Memo</span> <IconButton altText="info" icon={<Icon.Info />} />
        </div>
        <div className="SendSettings__row-right">
          <span></span>
        </div>
      </div>
      <div className="SendSettings__input-textarea">
        <textarea
          className="TextArea Card Card--highlight"
          autoComplete="off"
          id="mnemonic-input"
          placeholder="Memo (optional)"
          value={memo}
          onChange={(e: React.ChangeEvent<any>) => setMemo(e.target.value)}
        />
      </div>
      <div className="btn-continue">
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={() => navigateTo(ROUTES.sendPaymentConfirm)}
        >
          Review Send
        </Button>
      </div>
    </div>
  </PopupWrapper>
);
