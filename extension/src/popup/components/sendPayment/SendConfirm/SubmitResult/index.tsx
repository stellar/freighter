import React from "react";
import { useSelector } from "react-redux";
import { truncatedPublicKey } from "helpers/stellar";

import { Button, Loader } from "@stellar/design-system";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { transactionDataSelector } from "popup/ducks/transactionSubmission";
import "./styles.scss";

// TODO - helper for asset names
export const SubmitSuccess = ({
  amount,
  asset,
  viewDetails,
}: {
  amount: string;
  asset: string;
  viewDetails: () => void;
}) => {
  const { destination } = useSelector(transactionDataSelector);
  return (
    <div className="SubmitSuccess">
      <div>Successfuly sent</div>
      <div>
        {amount} {asset}
      </div>
      <div>{truncatedPublicKey(destination)}</div>
      <Button fullWidth onClick={() => viewDetails()}>
        Transaction Details
      </Button>
      <Button
        variant={Button.variant.tertiary}
        onClick={() => navigateTo(ROUTES.account)}
      >
        Done
      </Button>
    </div>
  );
};

export const SubmitPending = () => (
  <div className="SendConfirm">
    <Loader /> <span>Processing transaction</span>
  </div>
);

export const SubmitFail = () => {
  const { destination } = useSelector(transactionDataSelector);
  return (
    <div>
      <div>Transaction failed</div>
      <div>{destination}</div>
      <Button variant={Button.variant.tertiary}>Got it</Button>
    </div>
  );
};
