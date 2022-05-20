import React, { useState } from "react";
import StellarSdk, { Account } from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";
import { useHistory } from "react-router-dom";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";
import { Types } from "@stellar/wallet-sdk";

import { AppDispatch } from "popup/App";

import { emitMetric } from "helpers/metrics";
import { navigateTo } from "popup/helpers/navigate";
import { getCanonicalFromAsset, formatDomain } from "helpers/stellar";

import { PillButton } from "popup/basics/buttons/PillButton";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";

import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  ActionStatus,
  getAccountBalances,
  resetSubmission,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
  saveAsset,
  saveDestinationAsset,
} from "popup/ducks/transactionSubmission";

import { AssetIcon } from "popup/components/account/AccountAssets";

import { CURRENCY, Balances } from "@shared/api/types";

import "./styles.scss";

export type ManageAssetCurrency = CURRENCY & { domain: string };

interface ManageAssetRowsProps {
  assetRows: ManageAssetCurrency[];
  setErrorAsset: (errorAsset: string) => void;
  maxHeight: number;
  selectingSourceAsset?: boolean;
  selectingDestAsset?: boolean;
}

export const ManageAssetRows = ({
  assetRows,
  setErrorAsset,
  maxHeight,
  selectingSourceAsset = false,
  selectingDestAsset = false,
}: ManageAssetRowsProps) => {
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const {
    accountBalances: { balances = {} },
    submitStatus,
  } = useSelector(transactionSubmissionSelector);
  const [assetSubmitting, setAssetSubmitting] = useState("");
  const dispatch: AppDispatch = useDispatch();
  const history = useHistory();

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
      fee: StellarSdk.BASE_FEE,
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

    const res = await dispatch(
      signFreighterTransaction({
        transactionXDR,
        network: networkDetails.networkPassphrase,
      }),
    );

    if (signFreighterTransaction.fulfilled.match(res)) {
      const signedXDR = StellarSdk.TransactionBuilder.fromXDR(
        res.payload.signedTransaction,
        networkDetails.networkPassphrase,
      );

      const submitResp = await dispatch(
        submitFreighterTransaction({
          signedXDR,
          networkUrl: networkDetails.networkUrl,
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
        dispatch(resetSubmission());
        emitMetric(
          addTrustline
            ? METRIC_NAMES.manageAssetAddAsset
            : METRIC_NAMES.manageAssetRemoveAsset,
          { assetCode, assetIssuer },
        );
        navigateTo(ROUTES.account);
      }

      if (submitFreighterTransaction.rejected.match(submitResp)) {
        setErrorAsset(canonicalAsset);
        navigateTo(ROUTES.trustlineError);
      }
    }
  };

  const getAccountBalance = (canonical: string) => {
    if (!balances) {
      return "";
    }
    const bal: Types.Balance = balances[canonical as keyof Balances];
    if (bal) {
      return bal.total.toString();
    }
    return "";
  };

  return (
    <SimpleBar
      className="ManageAssetRows__scrollbar"
      style={{
        maxHeight: `${maxHeight}px`,
      }}
    >
      <div className="ManageAssetRows__content">
        {assetRows.map(({ code, domain, image, issuer }) => {
          if (!balances) return null;
          const canonicalAsset = getCanonicalFromAsset(code, issuer);
          const isTrustlineActive = Object.keys(balances).some(
            (balance) => balance === canonicalAsset,
          );
          const isActionPending = submitStatus === ActionStatus.PENDING;

          return (
            <div
              className={`ManageAssetRows__row ${
                selectingSourceAsset || selectingDestAsset ? "selectable" : ""
              }`}
              key={canonicalAsset}
              onClick={() => {
                if (selectingSourceAsset) {
                  dispatch(saveAsset(getCanonicalFromAsset(code, issuer)));
                  history.goBack();
                } else if (selectingDestAsset) {
                  dispatch(
                    saveDestinationAsset(getCanonicalFromAsset(code, issuer)),
                  );
                  history.goBack();
                }
              }}
            >
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
              {!(selectingSourceAsset || selectingDestAsset) && (
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
                    {isTrustlineActive ? "Remove" : "Add"}
                  </PillButton>
                </div>
              )}
              {selectingSourceAsset && (
                <div>
                  {getAccountBalance(getCanonicalFromAsset(code, issuer))}{" "}
                  {code}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </SimpleBar>
  );
};
