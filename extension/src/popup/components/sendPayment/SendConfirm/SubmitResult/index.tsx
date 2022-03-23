import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Asset } from "stellar-sdk";

import { getAssetFromCanonical, truncatedPublicKey } from "helpers/stellar";

import { Button, Icon, InfoBlock, TextLink } from "@stellar/design-system";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import {
  resetSubmission,
  transactionDataSelector,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { AccountDoesntExistWarning } from "popup/components/sendPayment/SendTo";
import { shouldAccountDoesntExistWarning } from "popup/components/sendPayment/SendAmount";

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
  const {
    destinationBalances,
    transactionData: { destination, amount, asset },
  } = useSelector(transactionSubmissionSelector);

  // ALEC TODO - remove
  // const hug = "HUG:GD4PLJJJK4PN7BETZLVQBXMU6JQJADKHSAELZZVFBPLNRIXRQSM433II";
  // // const amount = "100";
  // const amount = "0.75";
  // const destination =
  //   "GB4SFZUZIWKAUAJW2JR7CMBHZ2KNKGF3FMGMO7IF5P3EYXFA6NHI352W";
  // const asset = hug;
  // // const asset = "native";

  // const destinationBalances = {
  //   balances: {
  //     native: { token: { type: "native", code: "xlm" } },
  //     [hug]: {
  //       token: {
  //         type: "credit_alphanum4",
  //         code: "HUG",
  //         issuer: {
  //           key: "GD4PLJJJK4PN7BETZLVQBXMU6JQJADKHSAELZZVFBPLNRIXRQSM433II",
  //         },
  //       },
  //     },
  //   },
  //   isFunded: true,
  //   // isFunded: false,
  // };

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
    if (asset !== Asset.native().toString()) {
      let found = false;
      Object.keys(destinationBalances.balances || {}).forEach((key) => {
        if (asset === key) {
          found = true;
        }
      });
      if (!found) {
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
    return null;
  };

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
