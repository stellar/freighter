import React from "react";
import { useSelector } from "react-redux";

import { Button, Input, Icon } from "@stellar/design-system";

import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { PopupWrapper } from "popup/basics/PopupWrapper";
import { transactionDataSelector } from "popup/ducks/transactionSubmission";

import "./styles.scss";

export const SendSettingsFee = () => {
  const { transactionFee } = useSelector(transactionDataSelector);

  // ALEC TODO - make call to network for fee settings
  // const server = new StellarSdk.Server();
  // const networkFee = await server.feeStats();

  return (
    <PopupWrapper>
      <div onClick={() => navigateTo(ROUTES.sendPaymentSettings)}>
        <Icon.X />
      </div>
      <div className="TransactionFee">
        <div className="header">Transaction Fee</div>
        <Input
          id="transaction-fee-input"
          className="SendTo__input"
          value={transactionFee}
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
};
