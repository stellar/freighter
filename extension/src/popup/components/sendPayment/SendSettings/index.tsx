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
    <div className="SendSettings">
      <div className="header">Send Settings</div>
      <BackButton hasBackCopy />
      <div className="SendSettings__row">
        <div className="SendSettings__row-left">
          <span>Transaction fee</span>
          <IconButton altText="info" icon={<Icon.Info />} />
        </div>
        <div className="SendSettings__row-right">
          <span>{transactionFee}</span>
          <div>
            <Icon.ChevronRight />
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
          // ALEC TODO - on change
          // onChange={}
        />
      </div>
      <input
        className="SendTo__input"
        value={transactionFee}
        placeholder="transaction fee"
        onChange={(e: React.ChangeEvent<any>) =>
          setTransactionFee(e.target.value)
        }
      ></input>
      <input
        className="SendTo__input"
        value={memo}
        placeholder="memo"
        onChange={(e: React.ChangeEvent<any>) => setMemo(e.target.value)}
      ></input>
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
