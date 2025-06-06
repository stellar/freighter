import React, { useEffect, useState } from "react";
import { useNavigate, Navigate, useLocation } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { createPortal } from "react-dom";
import get from "lodash/get";
import { Button, Icon, Link, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Account, Asset, Operation, TransactionBuilder } from "stellar-sdk";
import { AppDispatch } from "popup/App";

import { AssetIcons, Balance, ErrorMessage } from "@shared/api/types";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

import { getAssetFromCanonical, xlmToStroop } from "helpers/stellar";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { RESULT_CODES, getResultCodes } from "popup/helpers/parseTransaction";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { ROUTES } from "popup/constants/routes";
import { hardwareWalletTypeSelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  startHwSign,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
  resetSubmission,
} from "popup/ducks/transactionSubmission";
import { FedOrGAddress } from "popup/basics/sendPayment/FedOrGAddress";
import { View } from "popup/basics/layout/View";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { TrustlineError } from "popup/components/manageAssets/TrustlineError";
import IconFail from "popup/assets/icon-fail.svg";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { findAssetBalance } from "popup/helpers/balance";
import { formatAmount } from "popup/helpers/formatters";
import { isAssetSuspicious } from "popup/helpers/blockaid";
import {
  RequestState,
  useGetAccountData,
} from "popup/views/Account/hooks/useGetAccountData";
import { Loading } from "popup/components/Loading";

import "./styles.scss";
import { newTabHref } from "helpers/urls";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { reRouteOnboarding } from "popup/helpers/route";

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
    transactionData: {
      destination,
      federationAddress,
      amount,
      asset,
      destinationAsset,
    },
  } = useSelector(transactionSubmissionSelector);

  const { t } = useTranslation();
  const location = useLocation();
  const isSwap = useIsSwap();
  const dispatch: AppDispatch = useDispatch();
  const navigate = useNavigate();

  const sourceAsset = getAssetFromCanonical(asset);
  const destinationCanonical = getAssetFromCanonical(
    destinationAsset || "native",
  );
  const { recommendedFee } = useNetworkFees();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [isTrustlineErrorShowing, setIsTrustlineErrorShowing] = useState(false);
  const { state: accountData, fetchData } = useGetAccountData({
    showHidden: false,
    includeIcons: true,
  });
  const isLoading =
    accountData.state === RequestState.IDLE ||
    accountData.state === RequestState.LOADING;

  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);

  const removeTrustline = async (
    publicKey: string,
    assetCode: string,
    assetIssuer: string,
  ) => {
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
      await dispatch(startHwSign({ transactionXDR, shouldSubmit: true }));
      trackRemoveTrustline();
    } else {
      await signAndSubmit(publicKey, transactionXDR, trackRemoveTrustline);
    }
  };

  const signAndSubmit = async (
    publicKey: string,
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
        navigateTo(ROUTES.account, navigate);
      }

      if (submitFreighterTransaction.rejected.match(submitResp)) {
        setIsTrustlineErrorShowing(true);
      }
    }
  };

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isLoading) {
    return <Loading />;
  }

  const hasError = accountData.state === RequestState.ERROR;

  if (accountData.data?.type === AppDataType.REROUTE) {
    if (accountData.data.shouldOpenTab) {
      openTab(newTabHref(accountData.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${accountData.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  if (!hasError) {
    reRouteOnboarding({
      type: accountData.data.type,
      applicationState: accountData.data.applicationState,
      state: accountData.state,
    });
  }

  // TODO: the remove trustline logic here does not work Soroban tokens. We should handle this case
  const suggestRemoveTrustline = (
    accountData.data?.balances.balances as Balance[]
  )
    ?.find((balance) => balance.contractId === asset)
    ?.available?.isZero();

  const sourceBalance = findAssetBalance(
    accountData.data!.balances.balances,
    sourceAsset,
  );
  const destBalance = findAssetBalance(
    accountData.data!.balances.balances,
    destinationCanonical,
  );
  const isSourceAssetSuspicious =
    !!sourceBalance &&
    "blockaidData" in sourceBalance &&
    isAssetSuspicious(sourceBalance.blockaidData);
  const isDestAssetSuspicious =
    !!destBalance &&
    "blockaidData" in destBalance &&
    isAssetSuspicious(destBalance.blockaidData);

  const resolvedData = accountData.data;

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
                      removeTrustline(
                        resolvedData!.publicKey,
                        sourceAsset.code,
                        sourceAsset.issuer,
                      )
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
                assetIcons={accountData.data?.balances?.icons || {}}
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
          variant="tertiary"
          onClick={() => viewDetails()}
          data-testid="SubmitResultDetailsButton"
        >
          {t("Details")}
        </Button>
        <Button
          size="md"
          variant="secondary"
          onClick={() => {
            dispatch(resetSubmission());
            navigateTo(ROUTES.account, navigate);
          }}
        >
          {t("Done")}
        </Button>
      </View.Footer>
      {isTrustlineErrorShowing
        ? createPortal(
            <TrustlineError balances={accountData.data!.balances} />,
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
  const navigate = useNavigate();
  const dispatch = useDispatch();

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
          variant="tertiary"
          size="md"
          onClick={() => {
            dispatch(resetSubmission());
            navigateTo(ROUTES.account, navigate);
          }}
        >
          {t("Got it")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
