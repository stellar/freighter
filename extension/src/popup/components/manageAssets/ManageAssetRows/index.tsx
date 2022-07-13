import React, { useState, useEffect } from "react";
import StellarSdk, { Account } from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";
import SimpleBar from "simplebar-react";
import { useTranslation } from "react-i18next";
import "simplebar-react/dist/simplebar.min.css";
import { CURRENCY } from "@shared/api/types";

import { AppDispatch } from "popup/App";

import { emitMetric } from "helpers/metrics";
import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  formatDomain,
  getCanonicalFromAsset,
  xlmToStroop,
} from "helpers/stellar";

import { PillButton } from "popup/basics/buttons/PillButton";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";

import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  ActionStatus,
  getAccountBalances,
  resetSubmission,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
  HwOverlayStatus,
  startHwSign,
} from "popup/ducks/transactionSubmission";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { LedgerConnect } from "popup/components/hardwareConnect/LedgerConnect";

import "./styles.scss";

export type ManageAssetCurrency = CURRENCY & { domain: string };

interface ManageAssetRowsProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  assetRows: ManageAssetCurrency[];
  setErrorAsset: (errorAsset: string) => void;
  maxHeight: number;
}

export const ManageAssetRows = ({
  children,
  header,
  assetRows,
  setErrorAsset,
  maxHeight,
}: ManageAssetRowsProps) => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const {
    accountBalances: { balances = {} },
    submitStatus,
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);
  const [assetSubmitting, setAssetSubmitting] = useState("");
  const dispatch: AppDispatch = useDispatch();
  const { recommendedFee } = useNetworkFees();
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);

  const server = new StellarSdk.Server(networkDetails.networkUrl);

  const changeTrustline = async (
    assetCode: string,
    assetIssuer: string,
    addTrustline: boolean,
  ) => {
    const changeParams = addTrustline ? {} : { limit: "0" };
    const sourceAccount: Account = await server.loadAccount(publicKey);
    const canonicalAsset = getCanonicalFromAsset(assetCode, assetIssuer);

    setAssetSubmitting(canonicalAsset);

    const transactionXDR = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: xlmToStroop(recommendedFee).toString(),
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

    const trackChangeTrustline = () => {
      emitMetric(
        addTrustline
          ? METRIC_NAMES.manageAssetAddAsset
          : METRIC_NAMES.manageAssetRemoveAsset,
        { assetCode, assetIssuer },
      );
    };

    if (isHardwareWallet) {
      await dispatch(startHwSign({ transactionXDR }));
      trackChangeTrustline();
    } else {
      await signAndSubmit(transactionXDR, trackChangeTrustline);
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
          signedXDR: res.payload.signedTransaction,
          networkDetails,
        }),
      );

      if (submitFreighterTransaction.fulfilled.match(submitResp)) {
        setAssetSubmitting("");
        dispatch(
          getAccountBalances({
            publicKey,
            networkDetails,
          }),
        );
        trackChangeTrustline();
        dispatch(resetSubmission());
        navigateTo(ROUTES.account);
      }

      if (submitFreighterTransaction.rejected.match(submitResp)) {
        setErrorAsset(assetSubmitting);
        navigateTo(ROUTES.trustlineError);
      }
    }
  };

  // watch submitStatus if used ledger to send transaction
  useEffect(() => {
    if (submitStatus === ActionStatus.ERROR) {
      setErrorAsset(assetSubmitting);
      navigateTo(ROUTES.trustlineError);
    } else if (submitStatus === ActionStatus.SUCCESS) {
      dispatch(resetSubmission());
      navigateTo(ROUTES.trustlineError);
    }
  }, [submitStatus, assetSubmitting, setErrorAsset, dispatch]);

  return (
    <>
      {hwStatus === HwOverlayStatus.IN_PROGRESS && <LedgerConnect />}
      <SimpleBar
        className="ManageAssetRows__scrollbar"
        style={{
          maxHeight: `${maxHeight}px`,
        }}
      >
        {header}
        <div className="ManageAssetRows__content">
          {assetRows.map(({ code, domain, image, issuer }) => {
            if (!balances) return null;
            const canonicalAsset = getCanonicalFromAsset(code, issuer);
            const isTrustlineActive = Object.keys(balances).some(
              (balance) => balance === canonicalAsset,
            );
            const isActionPending = submitStatus === ActionStatus.PENDING;

            return (
              <div className="ManageAssetRows__row" key={canonicalAsset}>
                <AssetIcon
                  assetIcons={code !== "XLM" ? { [canonicalAsset]: image } : {}}
                  code={code}
                  issuerKey={issuer}
                />
                <div className="ManageAssetRows__code">
                  {code}
                  <div className="ManageAssetRows__domain">
                    {formatDomain(domain)}
                  </div>
                </div>
                <div className="ManageAssetRows__button">
                  <PillButton
                    disabled={isActionPending}
                    isLoading={
                      isActionPending && assetSubmitting === canonicalAsset
                    }
                    onClick={() =>
                      changeTrustline(code, issuer, !isTrustlineActive)
                    }
                    type="button"
                  >
                    {isTrustlineActive ? t("Remove") : t("Add")}
                  </PillButton>
                </div>
              </div>
            );
          })}
        </div>
        {children}
      </SimpleBar>
    </>
  );
};
