import React, { useState } from "react";
import StellarSdk, { Account } from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";
import SimpleBar from "simplebar-react";
import "simplebar-react/dist/simplebar.min.css";

import { AppDispatch } from "popup/App";

import { navigateTo } from "popup/helpers/navigate";
import { getCanonicalFromAsset } from "helpers/stellar";

import { PillButton } from "popup/basics/buttons/PillButton";

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
} from "popup/ducks/transactionSubmission";

import { AssetIcon } from "popup/components/account/AccountAssets";

import { CURRENCY } from "@shared/api/types";

import "./styles.scss";

export type ManageAssetCurrency = CURRENCY & { domain: string };

interface ManageAssetRowsProps {
  assetRows: ManageAssetCurrency[];
  setErrorAsset: (errorAsset: string) => void;
  maxHeight: number;
}

export const ManageAssetRows = ({
  assetRows,
  setErrorAsset,
  maxHeight,
}: ManageAssetRowsProps) => {
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const {
    accountBalances: { balances = {} },
    submitStatus,
  } = useSelector(transactionSubmissionSelector);
  const [assetSubmitting, setAssetSubmitting] = useState("");
  const dispatch: AppDispatch = useDispatch();

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
        navigateTo(ROUTES.account);
      }

      if (submitFreighterTransaction.rejected.match(submitResp)) {
        setErrorAsset(canonicalAsset);
        navigateTo(ROUTES.trustlineError);
      }
    }
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
          const isSubmitting =
            submitStatus === ActionStatus.PENDING &&
            assetSubmitting === canonicalAsset;
          const isTrustlineActive = Object.keys(balances).some(
            (balance) => balance === canonicalAsset,
          );

          return (
            <div className="ManageAssetRows__row" key={code}>
              <AssetIcon
                assetIcons={code !== "XLM" ? { [code]: image } : {}}
                code={code}
                issuerKey={issuer}
              />
              <div className="ManageAssetRows__code">
                {code}
                <div className="ManageAssetRows__domain">
                  {domain
                    ? domain.replace("https://", "").replace("www.", "")
                    : "Stellar Network"}
                </div>
              </div>
              <div className="ManageAssetRows__button">
                <PillButton
                  isLoading={isSubmitting}
                  onClick={() =>
                    isSubmitting
                      ? null
                      : changeTrustline(code, issuer, !isTrustlineActive)
                  }
                  type="button"
                >
                  {isTrustlineActive ? "Remove" : "Add"}
                </PillButton>
              </div>
            </div>
          );
        })}
      </div>
    </SimpleBar>
  );
};
