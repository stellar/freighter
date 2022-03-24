import React, { useState, useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";

import StellarSdk from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";
import { Button, Card, Loader } from "@stellar/design-system";

import { getAssetFromCanonical, xlmToStroop } from "helpers/stellar";
import { AssetIcons } from "@shared/api/types";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import {
  ActionStatus,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
  addRecentAddress,
  resetSubmission,
} from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { BackButton } from "popup/basics/BackButton";
import { FedOrGAddress } from "popup/basics/sendPayment/FedOrGAddress";
import { AccountAssets } from "popup/components/account/AccountAssets";

import "./styles.scss";

export const TransactionDetails = ({
  goBack,
  isSendComplete = false,
}: {
  goBack: () => void;
  isSendComplete?: boolean;
}) => {
  const dispatch: AppDispatch = useDispatch();
  const submission = useSelector(transactionSubmissionSelector);
  const {
    destinationBalances,
    transactionData: {
      destination,
      federationAddress,
      amount,
      asset,
      memo,
      transactionFee,
    },
  } = submission;

  const transactionHash = submission.response?.hash;
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [assetIcons, setAssetIcons] = useState({} as AssetIcons);

  const horizonAsset = getAssetFromCanonical(asset);
  const assetTotals = [
    {
      token: { issuer: horizonAsset.issuer, code: horizonAsset.code },
      total: amount || "0",
    },
  ];

  useEffect(() => {
    (async () => {
      const iconURL = await getIconUrlFromIssuer({
        key: horizonAsset.issuer,
        code: horizonAsset.code,
        networkDetails,
      });
      setAssetIcons({ [horizonAsset.code]: iconURL });
    })();
  }, [horizonAsset.code, horizonAsset.issuer, networkDetails]);

  const getOperation = () => {
    // default to payment
    let op = StellarSdk.Operation.payment({
      destination,
      asset: horizonAsset,
      amount,
    });
    // create account if unfunded and sending xlm
    if (
      !destinationBalances.isFunded &&
      asset === StellarSdk.Asset.native().toString()
    ) {
      op = StellarSdk.Operation.createAccount({
        destination,
        startingBalance: amount,
      });
    }
    return op;
  };

  // handles signing and submitting
  const handleSend = async () => {
    const server = new StellarSdk.Server(networkDetails.networkUrl);

    try {
      const transactionXDR = await server
        .loadAccount(publicKey)
        .then((sourceAccount: Types.Account) => {
          const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
            fee: xlmToStroop(transactionFee).toString(),
            networkPassphrase: networkDetails.networkPassphrase,
          })
            .addOperation(getOperation())
            .addMemo(StellarSdk.Memo.text(memo))
            .setTimeout(180)
            .build();

          return transaction.toXDR();
        });

      const res = await dispatch(
        signFreighterTransaction({
          transactionXDR,
          network: networkDetails.networkPassphrase,
        }),
      );

      if (
        signFreighterTransaction.fulfilled.match(res) &&
        res.payload.signedTransaction
      ) {
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
          await dispatch(
            addRecentAddress({ publicKey: federationAddress || destination }),
          );
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="TransactionDetails">
      {submission.status === ActionStatus.PENDING && (
        <div className="TransactionDetails__processing">
          <Loader /> <span>Processing transaction</span>
        </div>
      )}
      <BackButton customBackAction={goBack} />
      <div className="SendPayment__header">
        {isSendComplete ? (
          <span>Sent {horizonAsset.code}</span>
        ) : (
          <span>Confirm Send</span>
        )}
      </div>
      <div className="TransactionDetails__card">
        <Card>
          <AccountAssets assetIcons={assetIcons} sortedBalances={assetTotals} />
        </Card>
      </div>
      <div className="TransactionDetails__row">
        <div>Sending to </div>
        <div className="TransactionDetails__row__right">
          <div className="TransactionDetails__identicon">
            <FedOrGAddress
              fedAddress={federationAddress}
              gAddress={destination}
            />
          </div>
        </div>
      </div>
      {!destination.startsWith("M") && (
        <div className="TransactionDetails__row">
          <div>Memo</div>
          <div className="TransactionDetails__row__right">{memo || "None"}</div>
        </div>
      )}
      <div className="TransactionDetails__row">
        <div>Network Fee </div>
        <div className="TransactionDetails__row__right">
          {transactionFee} {horizonAsset.code}
        </div>
      </div>
      <div className="TransactionDetails__buttons-row">
        {isSendComplete ? (
          <Button
            variant={Button.variant.tertiary}
            onClick={() =>
              openTab(
                `https://stellar.expert/explorer/${
                  networkDetails.isTestnet ? "testnet" : "public"
                }/tx/${transactionHash}`,
              )
            }
          >
            View on Stellar.expert
          </Button>
        ) : (
          <>
            <Button
              variant={Button.variant.tertiary}
              onClick={() => {
                dispatch(resetSubmission());
                navigateTo(ROUTES.account);
              }}
            >
              cancel
            </Button>
            <Button onClick={handleSend}>send</Button>
          </>
        )}
      </div>
    </div>
  );
};
