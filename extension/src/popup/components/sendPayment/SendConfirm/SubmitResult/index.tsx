import React from "react";
import { useDispatch, useSelector } from "react-redux";
import StellarSdk from "stellar-sdk";
import { truncatedPublicKey } from "helpers/stellar";

import { Button, Icon } from "@stellar/design-system";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import {
  resetSubmission,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";

import "./styles.scss";

// TODO - helper for asset names
export const SubmitSuccess = ({ viewDetails }: { viewDetails: () => void }) => {
  const dispatch = useDispatch();
  const { destination, amount, asset } = useSelector(transactionDataSelector);

  // ALEC TODO - move to helpers, and use in TransactionDetails as well
  let horizonAsset = StellarSdk.Asset.native();
  if (asset.includes(":")) {
    horizonAsset = new StellarSdk.Asset(
      asset.split(":")[0],
      asset.split(":")[1],
    );
  }

  return (
    <div className="SubmitSuccess">
      <div className="SubmitSuccess__header">Successfuly sent</div>
      <div className="SubmitSuccess__amount">
        {amount} {horizonAsset.code}
      </div>
      <div className="SubmitSuccess__icon">
        <Icon.ArrowDownCircle />
      </div>
      <div className="SubmitSuccess__identicon">
        <IdenticonImg publicKey={destination} />
        <span>{truncatedPublicKey(destination)}</span>
      </div>
      <div className="SubmitSuccess__button-rows">
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
