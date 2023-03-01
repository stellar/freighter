import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import get from "lodash/get";
import { Icon, TextLink } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import StellarSdk, { Account } from "stellar-sdk";
import { AppDispatch } from "popup/App";

import { AssetIcons, ErrorMessage } from "@shared/api/types";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

import { InfoBlock } from "popup/basics/InfoBlock";
import { Button } from "popup/basics/buttons/Button";

import { getAssetFromCanonical, xlmToStroop } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";
import { RESULT_CODES, getResultCodes } from "popup/helpers/parseTransaction";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { ROUTES } from "popup/constants/routes";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  startHwSign,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { FedOrGAddress } from "popup/basics/sendPayment/FedOrGAddress";
import { AssetIcon } from "popup/components/account/AccountAssets";
import IconFail from "popup/assets/icon-fail.svg";

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
    accountBalances,
    transactionData: {
      destination,
      federationAddress,
      amount,
      asset,
      destinationAsset,
    },
    assetIcons,
  } = useSelector(transactionSubmissionSelector);

  const { t } = useTranslation();
  const isSwap = useIsSwap();
  const dispatch: AppDispatch = useDispatch();

  const sourceAsset = getAssetFromCanonical(asset);
  const { recommendedFee } = useNetworkFees();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const server = stellarSdkServer(networkDetails.networkUrl);
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);

  const removeTrustline = async (assetCode: string, assetIssuer: string) => {
    const changeParams = { limit: "0" };
    const sourceAccount: Account = await server.loadAccount(publicKey);

    const transactionXDR = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: xlmToStroop(recommendedFee).toFixed(),
      networkPassphrase: networkDetails.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: new StellarSdk.Asset(assetCode, assetIssuer),
          ...changeParams,
        }),
      )
      .setTimeout(180)
      .build()
      .toXDR();

    const trackRemoveTrustline = () => {
      emitMetric(METRIC_NAMES.manageAssetRemoveAsset, {
        assetCode,
        assetIssuer,
      });
    };

    if (isHardwareWallet) {
      await dispatch(startHwSign({ transactionXDR, shouldSubmit: true }));
      trackRemoveTrustline();
    } else {
      await signAndSubmit(transactionXDR, trackRemoveTrustline);
    }
  };

  const signAndSubmit = async (
    transactionXDR: string,
    trackChangeTrustline: () => void,
  ) => {
    const res = await dispatch(
      signFreighterTransaction({
        transactionXDR,
        network: networkDetails.networkPassphrase,
      }),
    );

    if (signFreighterTransaction.fulfilled.match(res)) {
      const submitResp = await dispatch(
        submitFreighterTransaction({
          publicKey,
          signedXDR: res.payload.signedTransaction,
          networkDetails,
        }),
      );

      if (submitFreighterTransaction.fulfilled.match(submitResp)) {
        trackChangeTrustline();
        navigateTo(ROUTES.account);
      }

      if (submitFreighterTransaction.rejected.match(submitResp)) {
        navigateTo(ROUTES.trustlineError);
      }
    }
  };

  const suggestRemoveTrustline =
    accountBalances.balances &&
    accountBalances.balances[asset] &&
    accountBalances.balances[asset].available.isZero();

  return (
    <div className="SubmitResult">
      <div className="SubmitResult__header">
        {t("Successfully")} {isSwap ? t("swapped") : t("sent")}
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
      <div className="SubmitResult__suggest-remove-tl">
        {suggestRemoveTrustline && (
          <InfoBlock>
            <span className="remove-tl-contents">
              <p>
                Your {sourceAsset.code} balance is now empty. Would you like to
                remove the {sourceAsset.code} trustline?
              </p>
              <button
                onClick={() =>
                  removeTrustline(sourceAsset.code, sourceAsset.issuer)
                }
              >
                Remove Trustline
              </button>
            </span>
          </InfoBlock>
        )}
      </div>
      <div className="SubmitResult__button-rows__success">
        <Button variant={Button.variant.tertiary} onClick={() => viewDetails()}>
          {t("Details")}
        </Button>
        <Button
          onClick={() => {
            navigateTo(ROUTES.account);
          }}
        >
          {t("Done")}
        </Button>
      </div>
    </div>
  );
};

interface ErrorDetails {
  title: string;
  errorBlock: React.ReactNode;
  opError: RESULT_CODES;
  status: string;
}

export const SubmitFail = () => {
  const { error } = useSelector(transactionSubmissionSelector);
  const isSwap = useIsSwap();
  const { t } = useTranslation();

  useEffect(() => {
    emitMetric(METRIC_NAMES.sendPaymentError, { error });
  }, [error]);

  const getErrorDetails = (err: ErrorMessage | undefined): ErrorDetails => {
    const errorDetails: ErrorDetails = {
      title: "",
      errorBlock: <div></div>,
      opError: RESULT_CODES.tx_failed,
      status: "",
    };

    const httpCode = get(err, "response.status", "");
    const { operations: opErrors, transaction: txError } = getResultCodes(err);

    if (opErrors[0]) {
      errorDetails.opError = opErrors[0];
    } else {
      errorDetails.opError = txError;
    }

    switch (errorDetails.opError) {
      case RESULT_CODES.tx_insufficient_fee:
        errorDetails.title = t("Insufficient Fee");
        errorDetails.errorBlock = (
          <InfoBlock variant={InfoBlock.variant.error}>
            <div>
              {t(
                "Fees can vary depending on the network congestion. Please try using the suggested fee and try again.",
              )}
              <TextLink
                underline
                variant={TextLink.variant.secondary}
                href="https://developers.stellar.org/docs/glossary/fees/"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about fees")}
              </TextLink>
            </div>
          </InfoBlock>
        );
        break;
      case RESULT_CODES.op_underfunded:
        errorDetails.title = t("Insufficient Balance");
        errorDetails.errorBlock = (
          <InfoBlock variant={InfoBlock.variant.error}>
            <div>
              {t(
                "Your account balance is not sufficient for this transaction. Please review the transaction and try again.",
              )}
            </div>
          </InfoBlock>
        );
        break;
      case RESULT_CODES.op_no_destination:
        errorDetails.title = t("Destination account doesn’t exist");
        errorDetails.errorBlock = (
          <InfoBlock variant={InfoBlock.variant.error}>
            <div>
              {t(
                "The destination account doesn’t exist. Make sure it is a funded Stellar account and try again.",
              )}
              <TextLink
                underline
                variant={TextLink.variant.secondary}
                href="https://developers.stellar.org/docs/tutorials/create-account/#create-account"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about account funding")}
              </TextLink>
            </div>
          </InfoBlock>
        );
        break;
      case RESULT_CODES.op_no_trust:
        errorDetails.title = t(
          "Destination account does not accept this asset",
        );
        errorDetails.errorBlock = (
          <InfoBlock variant={InfoBlock.variant.error}>
            <div>
              {t(
                "The destination account does not accept the asset you’re sending. The destination account must opt to accept this asset before receiving it.",
              )}
              <TextLink
                underline
                variant={TextLink.variant.secondary}
                href="https://developers.stellar.org/docs/issuing-assets/anatomy-of-an-asset/#trustlines"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about trustlines")}
              </TextLink>
            </div>
          </InfoBlock>
        );
        break;
      case RESULT_CODES.op_under_dest_min:
        errorDetails.title = t("Conversion rate changed");
        errorDetails.errorBlock = (
          <InfoBlock variant={InfoBlock.variant.error}>
            <div>
              {t("Please check the new rate and try again.")}
              <TextLink
                underline
                variant={TextLink.variant.secondary}
                href="https://developers.stellar.org/docs/start/list-of-operations/#path-payment-strict-send"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about conversion rates")}
              </TextLink>
            </div>
          </InfoBlock>
        );
        break;
      case RESULT_CODES.op_low_reserve:
        errorDetails.title = t("Account minimum balance is too low");
        errorDetails.errorBlock = (
          <InfoBlock variant={InfoBlock.variant.error}>
            <div>
              {t(
                "To create a new account you need to send at least 1 XLM to it.",
              )}
              <TextLink
                underline
                variant={TextLink.variant.secondary}
                href="https://developers.stellar.org/docs/start/list-of-operations/#path-payment-strict-send"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about conversion rates")}
              </TextLink>
            </div>
          </InfoBlock>
        );
        break;
      default:
        errorDetails.status = httpCode;
        errorDetails.title = `${
          isSwap ? t("Swap failed") : t("Transaction failed")
        }`;
        errorDetails.errorBlock = (
          <InfoBlock variant={InfoBlock.variant.error}>
            <div>{t("One or more operations in this transaction failed.")}</div>
          </InfoBlock>
        );
    }
    return errorDetails;
  };
  const errorDetails = getErrorDetails(error);

  return (
    <div className="SubmitResult">
      <div className="SubmitResult__content">
        <div className="SubmitResult__header">{t("Error")}</div>
        <div className="SubmitResult__amount">{errorDetails.title}</div>
        <div className="SubmitResult__icon SubmitResult__fail">
          <img src={IconFail} alt="Icon Fail" />
        </div>
        <div className="SubmitResult__error-code">
          {errorDetails.status ? `${errorDetails.status}:` : ""}{" "}
          {errorDetails.opError}
        </div>
      </div>
      <div className="SubmitResult__error-block">{errorDetails.errorBlock}</div>
      <div className="SubmitResult__button-rows__fail">
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={() => {
            navigateTo(ROUTES.account);
          }}
        >
          {t("Got it")}
        </Button>
      </div>
    </div>
  );
};
