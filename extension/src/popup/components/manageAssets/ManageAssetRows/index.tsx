import React, { useState } from "react";
import StellarSdk, { Account } from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";
import { Loader } from "@stellar/design-system";

import { AppDispatch } from "popup/App";

import { navigateTo } from "popup/helpers/navigate";

import { ROUTES } from "popup/constants/routes";

import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  ActionStatus,
  getAccountBalances,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";

import { AssetIcon } from "popup/components/account/AccountAssets";

import { CURRENCY } from "@shared/api/types";

import "./styles.scss";

export type ManageAssetCurrency = CURRENCY & { domain: string };

export const ManageAssetRows = ({
  assetRows,
}: {
  assetRows: ManageAssetCurrency[];
}) => {
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const {
    accountBalances: { balances = {} },
    status,
  } = useSelector(transactionSubmissionSelector);
  const [assetSubmitting, setSubmitting] = useState("");
  const dispatch: AppDispatch = useDispatch();

  const server = new StellarSdk.Server(networkDetails.networkUrl);

  const changeTrustline = async (
    assetCode: string,
    assetIssuer: string,
    addTrustline: boolean,
  ) => {
    const changeParams = addTrustline ? {} : { limit: "0" };
    const sourceAccount: Account = await server.loadAccount(publicKey);
    setSubmitting(`${assetCode}:${assetIssuer}`);

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
      .setTimeout(0)
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
        setSubmitting("");
        dispatch(
          getAccountBalances({
            publicKey,
            networkDetails,
          }),
        );
      }

      if (submitFreighterTransaction.rejected.match(submitResp)) {
        navigateTo(ROUTES.trustlineError);
      }
    }
  };

  return (
    <div className="ManageAssetRows">
      {assetRows.map(({ code, domain, image, issuer }) => {
        if (!balances) return null;
        const asset = `${code}:${issuer}`;
        const isSubmitting =
          status === ActionStatus.PENDING && assetSubmitting === asset;
        const isTrustlineActive = Object.keys(balances).some(
          (balance) =>
            balance === asset || (code === "XLM" && balance === "native"),
        );

        return (
          <div className="ManageAssetRows__row" key={code}>
            <AssetIcon
              assetIcons={code !== "XLM" ? { code: image } : {}}
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
            <div
              className={`ManageAssetRows__button ${
                isSubmitting ? "ManageAssetRows__button--submitting" : ""
              }`}
              onClick={() =>
                isSubmitting
                  ? null
                  : changeTrustline(code, issuer, !isTrustlineActive)
              }
            >
              {isSubmitting ? <Loader /> : null}
              {isTrustlineActive ? "Remove" : "Add"}
            </div>
          </div>
        );
      })}
    </div>
  );
};
