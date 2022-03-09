import React from "react";

import { Button, Input } from "@stellar/design-system";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";

import { PopupWrapper } from "popup/basics/PopupWrapper";

import "./styles.scss";

export const SendSettingsFee = ({
  transactionFee,
  setTransactionFee,
}: {
  transactionFee: string;
  setTransactionFee: (state: string) => void;
}) => (
  <PopupWrapper>
    <div className="TransactionFee">
      <div className="TransactionFee__header">Transaction Fee</div>
      <Input
        id="transaction-fee-input"
        className="SendTo__input"
        value={transactionFee}
        onChange={(e: React.ChangeEvent<any>) =>
          setTransactionFee(e.target.value)
        }
      ></Input>
      <Button
        fullWidth
        variant={Button.variant.tertiary}
        onClick={() => navigateTo(ROUTES.sendPaymentSettings)}
      >
        Done
      </Button>
    </div>
  </PopupWrapper>
);
