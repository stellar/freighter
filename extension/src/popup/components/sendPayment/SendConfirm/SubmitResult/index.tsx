import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { Asset } from "stellar-sdk";
import get from "lodash/get";
import { Icon, TextLink } from "@stellar/design-system";

import { AssetIcons } from "@shared/api/types";

import { InfoBlock } from "popup/basics/InfoBlock";
import { Button } from "popup/basics/buttons/Button";

import { getAssetFromCanonical } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { RESULT_CODES } from "popup/helpers/parseTransaction";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { ROUTES } from "popup/constants/routes";
import {
  transactionSubmissionSelector,
  isPathPaymentSelector,
} from "popup/ducks/transactionSubmission";
import {
  AccountDoesntExistWarning,
  shouldAccountDoesntExistWarning,
} from "popup/components/sendPayment/SendTo";
import { FedOrGAddress } from "popup/basics/sendPayment/FedOrGAddress";
import { AssetIcon } from "popup/components/account/AccountAssets";

import "./styles.scss";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

const SwapAssetsIcon = ({
  sourceCanon,
  destCanon,
  assetIcons,
}: {
  sourceCanon: string;
  destCanon: string;
  assetIcons: AssetIcons;
}) => {
  const source = getAssetFromCanonical(sourceCanon);
  const dest = getAssetFromCanonical(destCanon);
  return (
    <div className="SwapAssetsIcon">
      <AssetIcon
        assetIcons={assetIcons}
        code={source.code}
        issuerKey={source.issuer}
      />
      {source.code}
      <Icon.ArrowRight />
      <AssetIcon
        assetIcons={assetIcons}
        code={dest.code}
        issuerKey={dest.issuer}
      />
      {dest.code}
    </div>
  );
};

export const SubmitSuccess = ({ viewDetails }: { viewDetails: () => void }) => {
  const {
    transactionData: {
      destination,
      federationAddress,
      amount,
      asset,
      destinationAsset,
    },
    assetIcons,
  } = useSelector(transactionSubmissionSelector);
  const isSwap = useIsSwap();

  const sourceAsset = getAssetFromCanonical(asset);

  return (
    <div className="SubmitResult">
      <div className="SubmitResult__header">
        Successfuly {isSwap ? "swapped" : "sent"}
      </div>
      <div className="SubmitResult__amount">
        {amount} {sourceAsset.code}
      </div>
      <div className="SubmitResult__icon SubmitResult__success">
        <Icon.ArrowDownCircle />
      </div>
      <div className="SubmitResult__identicon">
        {isSwap ? (
          <SwapAssetsIcon
            sourceCanon={asset}
            destCanon={destinationAsset}
            assetIcons={assetIcons}
          />
        ) : (
          <FedOrGAddress
            fedAddress={federationAddress}
            gAddress={destination}
          />
        )}
      </div>
      <div className="SubmitResult__button-rows__success">
        <Button fullWidth onClick={() => viewDetails()}>
          Transaction Details
        </Button>
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={() => {
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
  const {
    destinationBalances,
    error,
    transactionData: {
      destination,
      federationAddress,
      amount,
      asset,
      destinationAsset,
    },
    assetIcons,
  } = useSelector(transactionSubmissionSelector);
  const isPathPayment = useSelector(isPathPaymentSelector);
  const isSwap = useIsSwap();

  const sourceAsset = getAssetFromCanonical(asset);

  useEffect(() => {
    emitMetric(METRIC_NAMES.sendPaymentError, { error });
  }, [error]);

  const decideError = () => {
    // unfunded destination
    if (
      !isSwap &&
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
            <div>
              <strong>NO TRUSTLINE TO SENT ASSET</strong>
              <div>
                The receiving account doesn’t have a trustline to the sent
                asset: <strong>{sourceAsset.code}</strong>.
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
            </div>
          </InfoBlock>
        );
      }
    }

    if (isPathPayment || isSwap) {
      const resultCodes = get(error, "response.extras.result_codes.operations");
      if (resultCodes && resultCodes.includes(RESULT_CODES.op_under_dest_min)) {
        return (
          <InfoBlock variant={InfoBlock.variant.error}>
            <div>
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
      <div className="SubmitResult__amount">
        {isSwap ? "Swap" : "Transaction"} Failed
      </div>
      <div className="SubmitResult__icon SubmitResult__fail">
        <Icon.XCircle />
      </div>
      <div className="SubmitResult__identicon">
        {isSwap ? (
          <SwapAssetsIcon
            sourceCanon={asset}
            destCanon={destinationAsset}
            assetIcons={assetIcons}
          />
        ) : (
          <FedOrGAddress
            fedAddress={federationAddress}
            gAddress={destination}
          />
        )}
      </div>
      <div className="SubmitResult__error-block">{decideError()}</div>
      <div className="SubmitResult__button-rows__fail">
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={() => {
            navigateTo(ROUTES.account);
          }}
        >
          Got it
        </Button>
      </div>
    </div>
  );
};
