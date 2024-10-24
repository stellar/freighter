import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { createPortal } from "react-dom";
import get from "lodash/get";
import { Button, Icon, Link, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Account, Asset, Operation, TransactionBuilder } from "stellar-sdk";
import { AppDispatch } from "popup/App";

import { AssetIcons, ErrorMessage } from "@shared/api/types";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

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
import { View } from "popup/basics/layout/View";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { TrustlineError } from "popup/components/manageAssets/TrustlineError";
import IconFail from "popup/assets/icon-fail.svg";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { formatAmount } from "popup/helpers/formatters";
import { isAssetSuspicious } from "popup/helpers/blockaid";

import "./styles.scss";

const SwapAssetsIcon = ({
  sourceCanon,
  destCanon,
  assetIcons,
  isSourceSuspicious,
  isDestSuspicious,
}: {
  sourceCanon: string;
  destCanon: string;
  assetIcons: AssetIcons;
  isSourceSuspicious: boolean;
  isDestSuspicious: boolean;
}) => {
  const source = getAssetFromCanonical(sourceCanon);
  const dest = getAssetFromCanonical(destCanon);

  return (
    <div className="SwapAssetsIcon">
      <AssetIcon
        assetIcons={assetIcons}
        code={source.code}
        issuerKey={source.issuer}
        isSuspicious={isSourceSuspicious}
      />
      <span data-testid="SubmitResultSource">{source.code}</span>
      <Icon.ArrowRight />
      <AssetIcon
        assetIcons={assetIcons}
        code={dest.code}
        issuerKey={dest.issuer}
        isSuspicious={isDestSuspicious}
      />
      <span data-testid="SubmitResultDestination">{dest.code}</span>
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
  const [isTrustlineErrorShowing, setIsTrustlineErrorShowing] = useState(false);

  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);
  const isSourceAssetSuspicious = isAssetSuspicious(
    accountBalances.balances?.[asset]?.blockaidData,
  );
  const isDestAssetSuspicious = isAssetSuspicious(
    accountBalances.balances?.[destinationAsset]?.blockaidData,
  );

  const removeTrustline = async (assetCode: string, assetIssuer: string) => {
    const changeParams = { limit: "0" };
    const sourceAccount: Account = await server.loadAccount(publicKey);

    const transactionXDR = new TransactionBuilder(sourceAccount, {
      fee: xlmToStroop(recommendedFee).toFixed(),
      networkPassphrase: networkDetails.networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset: new Asset(assetCode, assetIssuer),
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
      // eslint-disable-next-line
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
        setIsTrustlineErrorShowing(true);
      }
    }
  };

  // TODO: the remove trustline logic here does not work Soroban tokens. We should handle this case

  const suggestRemoveTrustline =
    accountBalances.balances &&
    accountBalances.balances[asset] &&
    accountBalances.balances[asset].available?.isZero();

  return (
    <React.Fragment>
      <View.AppHeader
        pageTitle={`${t("Successfully")} ${isSwap ? t("swapped") : t("sent")}`}
      />
      <View.Content
        contentFooter={
          <div className="SubmitResult__suggest-remove-tl">
            {suggestRemoveTrustline && (
              <Notification variant="primary" title={t("Remove trustline")}>
                <span className="remove-tl-contents">
                  <p>
                    Your {sourceAsset.code} balance is now empty. Would you like
                    to remove the {sourceAsset.code} trustline?
                  </p>
                  <button
                    onClick={() =>
                      removeTrustline(sourceAsset.code, sourceAsset.issuer)
                    }
                  >
                    Remove Trustline
                  </button>
                </span>
              </Notification>
            )}
          </div>
        }
      >
        <div className="SubmitResult__content">
          <div
            className="SubmitResult__amount"
            data-testid="SubmitResultAmount"
          >
            {formatAmount(amount)} {sourceAsset.code}
          </div>
          <div className="SubmitResult__icon SubmitResult__success">
            <Icon.ArrowCircleDown />
          </div>
          <div className="SubmitResult__identicon">
            {isSwap ? (
              <SwapAssetsIcon
                sourceCanon={asset}
                destCanon={destinationAsset}
                assetIcons={assetIcons}
                isSourceSuspicious={isSourceAssetSuspicious}
                isDestSuspicious={isDestAssetSuspicious}
              />
            ) : (
              <FedOrGAddress
                fedAddress={federationAddress}
                gAddress={destination}
              />
            )}
          </div>
        </div>
      </View.Content>
      <View.Footer isInline>
        <Button
          size="md"
          variant="secondary"
          onClick={() => viewDetails()}
          data-testid="SubmitResultDetailsButton"
        >
          {t("Details")}
        </Button>
        <Button
          size="md"
          variant="primary"
          onClick={() => {
            navigateTo(ROUTES.account);
          }}
        >
          {t("Done")}
        </Button>
      </View.Footer>
      {isTrustlineErrorShowing
        ? createPortal(
            <TrustlineError />,
            document.querySelector("#modal-root")!,
          )
        : null}
    </React.Fragment>
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
      errorDetails.opError = opErrors[0] as RESULT_CODES;
    } else {
      errorDetails.opError = txError as RESULT_CODES;
    }

    switch (errorDetails.opError) {
      case RESULT_CODES.tx_insufficient_fee:
        errorDetails.title = t("Insufficient Fee");
        errorDetails.errorBlock = (
          <Notification variant="error" title={t("Network fees")}>
            <div>
              {t(
                "Fees can vary depending on the network congestion. Please try using the suggested fee and try again.",
              )}{" "}
              <Link
                isUnderline
                variant="secondary"
                href="https://developers.stellar.org/docs/glossary/fees/"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about fees")}
              </Link>
            </div>
          </Notification>
        );
        break;
      case RESULT_CODES.op_underfunded:
        errorDetails.title = t("Insufficient Balance");
        errorDetails.errorBlock = (
          <Notification
            variant="error"
            title={t(
              "Your account balance is not sufficient for this transaction. Please review the transaction and try again.",
            )}
          />
        );
        break;
      case RESULT_CODES.op_no_destination:
        errorDetails.title = t("Destination account doesn’t exist");
        errorDetails.errorBlock = (
          <Notification
            variant="error"
            title={t("The destination account doesn’t exist")}
          >
            <div>
              {t("Make sure it is a funded Stellar account and try again.")}{" "}
              <Link
                isUnderline
                variant="secondary"
                href="https://developers.stellar.org/docs/tutorials/create-account/#create-account"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about account funding")}
              </Link>
            </div>
          </Notification>
        );
        break;
      case RESULT_CODES.op_no_trust:
        errorDetails.title = t(
          "Destination account does not accept this asset",
        );
        errorDetails.errorBlock = (
          <Notification
            variant="error"
            title={t(
              "The destination account does not accept the asset you’re sending",
            )}
          >
            <div>
              {t(
                "The destination account must opt to accept this asset before receiving it.",
              )}{" "}
              <Link
                isUnderline
                variant="secondary"
                href="https://developers.stellar.org/docs/issuing-assets/anatomy-of-an-asset/#trustlines"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about trustlines")}
              </Link>
            </div>
          </Notification>
        );
        break;
      case RESULT_CODES.op_under_dest_min:
        errorDetails.title = t("Conversion rate changed");
        errorDetails.errorBlock = (
          <Notification variant="error" title={t("Conversion rate")}>
            <div>
              {t("Please check the new rate and try again.")}{" "}
              <Link
                isUnderline
                variant="secondary"
                href="https://developers.stellar.org/docs/start/list-of-operations/#path-payment-strict-send"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about conversion rates")}
              </Link>
            </div>
          </Notification>
        );
        break;
      case RESULT_CODES.op_low_reserve:
        errorDetails.title = t("Account minimum balance is too low");
        errorDetails.errorBlock = (
          <Notification variant="error" title={t("New account")}>
            <div>
              {t(
                "To create a new account you need to send at least 1 XLM to it.",
              )}{" "}
              <Link
                isUnderline
                variant="secondary"
                href="https://developers.stellar.org/docs/start/list-of-operations/#path-payment-strict-send"
                rel="noreferrer"
                target="_blank"
              >
                {t("Learn more about conversion rates")}
              </Link>
            </div>
          </Notification>
        );
        break;
      default:
        errorDetails.status = httpCode as string;
        errorDetails.title = `${
          isSwap ? t("Swap failed") : t("Transaction failed")
        }`;
        errorDetails.errorBlock = (
          <Notification
            variant="error"
            title={t("One or more operations in this transaction failed.")}
          />
        );
    }
    return errorDetails;
  };
  const errDetails = getErrorDetails(error);

  return (
    <React.Fragment>
      <View.AppHeader pageTitle={t("Error")} />
      <View.Content>
        <div className="SubmitResult__content">
          <div className="SubmitResult__amount">{errDetails.title}</div>
          <div className="SubmitResult__icon SubmitResult__fail">
            <img src={IconFail} alt="Icon Fail" />
          </div>
          <div className="SubmitResult__error-code">
            {errDetails.status ? `Status ${errDetails.status}:` : ""}{" "}
            {errDetails.opError}
          </div>
        </div>
        <div className="SubmitResult__error-block">{errDetails.errorBlock}</div>
      </View.Content>
      <View.Footer>
        <Button
          isFullWidth
          variant="secondary"
          size="md"
          onClick={() => {
            navigateTo(ROUTES.account);
          }}
        >
          {t("Got it")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
