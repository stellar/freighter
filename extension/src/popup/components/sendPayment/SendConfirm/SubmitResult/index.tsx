import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Asset } from "stellar-sdk";
import get from "lodash/get";
import { getAssetFromCanonical } from "helpers/stellar";

import { Icon, InfoBlock, TextLink } from "@stellar/design-system";
import { Button } from "popup/basics/buttons/Button";
import { navigateTo } from "popup/helpers/navigate";
import { RESULT_CODES } from "popup/helpers/parseTransaction";
import { ROUTES } from "popup/constants/routes";
import {
  resetSubmission,
  transactionDataSelector,
  transactionSubmissionSelector,
  isPathPaymentSelector,
} from "popup/ducks/transactionSubmission";
import {
  AccountDoesntExistWarning,
  shouldAccountDoesntExistWarning,
} from "popup/components/sendPayment/SendTo";
import { FedOrGAddress } from "popup/basics/sendPayment/FedOrGAddress";

import "./styles.scss";

export const SubmitSuccess = ({ viewDetails }: { viewDetails: () => void }) => {
  const dispatch = useDispatch();
  const { destination, federationAddress, amount, asset } = useSelector(
    transactionDataSelector,
  );

  const horizonAsset = getAssetFromCanonical(asset);

  return (
    <div className="SubmitResult">
      <div className="SubmitResult__header">Successfuly sent</div>
      <div className="SubmitResult__amount">
        {amount} {horizonAsset.code}
      </div>
      <div className="SubmitResult__icon SubmitResult__success">
        <Icon.ArrowDownCircle />
      </div>
      <div className="SubmitResult__identicon">
        <FedOrGAddress fedAddress={federationAddress} gAddress={destination} />
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
  const {
    destinationBalances,
    error,
    transactionData: { destination, federationAddress, amount, asset },
  } = useSelector(transactionSubmissionSelector);
  const isPathPayment = useSelector(isPathPaymentSelector);

  const horizonAsset = getAssetFromCanonical(asset);

  const decideError = () => {
    // unfunded destination
    if (
      shouldAccountDoesntExistWarning(
        destinationBalances.isFunded || false,
        asset,
        amount,
      )
    ) {
      return <AccountDoesntExistWarning />;
    }

    // no trustline
    if (!isPathPayment && asset !== Asset.native().toString()) {
      const keys = Object.keys(destinationBalances.balances || {});
      if (!keys.some((key) => key === asset)) {
        return (
          <InfoBlock variant={InfoBlock.variant.error}>
            <strong>NO TRUSTLINE TO SENT ASSET</strong>
            <div>
              The receiving account doesn’t have a trustline to the sent asset:{" "}
              <strong>{horizonAsset.code}</strong>.
              <TextLink
                underline
                variant={TextLink.variant.secondary}
                href="https://developers.stellar.org/docs/issuing-assets/anatomy-of-an-asset/#trustlines"
                rel="noreferrer"
                target="_blank"
              >
                Learn more about trustlines
              </TextLink>
            </div>
          </InfoBlock>
        );
      }
    }

    if (isPathPayment) {
      const resultCodes = get(error, "response.extras.result_codes.operations");
      if (resultCodes.includes(RESULT_CODES.op_under_dest_min)) {
        return (
          <InfoBlock variant={InfoBlock.variant.error}>
            <strong>CONVERSION RATE CHANGED</strong>
            <div>
              Please check the new rate and try again.{" "}
              <TextLink
                underline
                variant={TextLink.variant.secondary}
                href="https://developers.stellar.org/docs/glossary/decentralized-exchange/#cross-asset-payments"
                rel="noreferrer"
                target="_blank"
              >
                Learn more about conversion rates
              </TextLink>
            </div>
          </InfoBlock>
        );
      }
    }
    return null;
  };

  return (
    <div className="SubmitResult">
      <div className="SubmitResult__header">Error</div>
      <div className="SubmitResult__amount">Transaction failed</div>
      <div className="SubmitResult__icon SubmitResult__fail">
        <Icon.XCircle />
      </div>
      <div className="SubmitResult__identicon">
        <FedOrGAddress fedAddress={federationAddress} gAddress={destination} />
      </div>
      <div className="SubmitResult__error-block">{decideError()}</div>
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
