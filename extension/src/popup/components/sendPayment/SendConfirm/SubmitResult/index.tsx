import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAssetFromCanonical, truncatedPublicKey } from "helpers/stellar";

import { Button, Icon } from "@stellar/design-system";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import {
  resetSubmission,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";

import "./styles.scss";

export const SubmitSuccess = ({ viewDetails }: { viewDetails: () => void }) => {
  const dispatch = useDispatch();
  const { destination, amount, asset } = useSelector(transactionDataSelector);

  const horizonAsset = getAssetFromCanonical(asset);

  return (
    <div className="SubmitResult">
      <div className="SubmitResult__header">Successfuly sent</div>
      <div className="SubmitResult__amount">
        {amount} {horizonAsset.code}
      </div>
      <div className="SubmitResult__icon">
        <Icon.ArrowDownCircle />
      </div>
      <div className="SubmitResult__identicon">
        <IdenticonImg publicKey={destination} />
        <span>{truncatedPublicKey(destination)}</span>
      </div>
      <div className="SubmitResult__button-rows__success">
        <Button fullWidth onClick={() => viewDetails()}>
          Transaction Details
        </Button>
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={() => {
            dispatch(resetSubmission());
            navigateTo(ROUTES.account);
          }}
        >
          Done
        </Button>
      </div>
    </div>
  );
};

export const SubmitFail = () => {
  const dispatch = useDispatch();
  const { destination } = useSelector(transactionDataSelector);

  return (
    <div className="SubmitResult">
      <div className="SubmitResult__header">Error</div>
      <div className="SubmitResult__amount">Transaction failed</div>
      <div className="SubmitResult__icon">
        <Icon.XCircle />
      </div>
      <div className="SubmitResult__identicon">
        <IdenticonImg publicKey={destination} />
        <span>{truncatedPublicKey(destination)}</span>
      </div>
      <div className="SubmitResult__button-rows__fail">
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={() => {
            dispatch(resetSubmission());
            navigateTo(ROUTES.account);
          }}
        >
          Got it
        </Button>
      </div>
    </div>
  );
};
