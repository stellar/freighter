import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { truncatedPublicKey } from "helpers/stellar";

import { Button } from "@stellar/design-system";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import {
  resetSubmission,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import "./styles.scss";

// TODO - helper for asset names
export const SubmitSuccess = ({ viewDetails }: { viewDetails: () => void }) => {
  const dispatch = useDispatch();
  const { destination, amount, asset } = useSelector(transactionDataSelector);
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
        onClick={() => {
          dispatch(resetSubmission());
          navigateTo(ROUTES.account);
        }}
      >
        Done
      </Button>
    </div>
  );
};

export const SubmitFail = () => {
  const dispatch = useDispatch();
  const { destination } = useSelector(transactionDataSelector);
  return (
    <div>
      <div>Transaction failed</div>
      <div>{destination}</div>
      <Button
        variant={Button.variant.tertiary}
        onClick={() => {
          dispatch(resetSubmission());
          navigateTo(ROUTES.account);
        }}
      >
        Got it
      </Button>
    </div>
  );
};
