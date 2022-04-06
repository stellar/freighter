import React, { useState, useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";
import BigNumber from "bignumber.js";
import StellarSdk from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";
import { Card, Loader } from "@stellar/design-system";

import {
  getAssetFromCanonical,
  xlmToStroop,
  getConversionRate,
} from "helpers/stellar";
import { AssetIcons } from "@shared/api/types";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";

import { Button } from "popup/basics/buttons/Button";
import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import {
  ActionStatus,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
  addRecentAddress,
  resetSubmission,
  isPathPaymentSelector,
} from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { FedOrGAddress } from "popup/basics/sendPayment/FedOrGAddress";
import { AccountAssets } from "popup/components/account/AccountAssets";

import "./styles.scss";

export const TransactionDetails = ({ goBack }: { goBack: () => void }) => {
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
      allowedSlippage,
      destinationAsset,
      destinationAmount,
      path,
    },
    assetIcons,
  } = submission;

  const transactionHash = submission.response?.hash;
  const isPathPayment = useSelector(isPathPaymentSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [destAssetIcons, setDestAssetIcons] = useState({} as AssetIcons);

  const sourceAsset = getAssetFromCanonical(asset);
  const destAsset = getAssetFromCanonical(destinationAsset || "native");

  // load destination asset icons
  useEffect(() => {
    (async () => {
      const iconURL = await getIconUrlFromIssuer({
        key: destAsset.issuer,
        code: destAsset.code,
        networkDetails,
      });
      setDestAssetIcons({ [destAsset.code]: iconURL });
    })();
  }, [destAsset.code, destAsset.issuer, networkDetails]);

  const getOperation = () => {
    // path payment
    if (isPathPayment) {
      const mult = 1 - parseFloat(allowedSlippage) / 100;
      const destMin = new BigNumber(destinationAmount).times(
        new BigNumber(mult),
      );
      return StellarSdk.Operation.pathPaymentStrictSend({
        sendAsset: getAssetFromCanonical(asset),
        sendAmount: amount,
        destination,
        destAsset: getAssetFromCanonical(destinationAsset),
        destMin: destMin.toFixed(7),
        path: path.map((p) => getAssetFromCanonical(p)),
      });
    }
    // create account if unfunded and sending xlm
    if (
      !destinationBalances.isFunded &&
      asset === StellarSdk.Asset.native().toString()
    ) {
      return StellarSdk.Operation.createAccount({
        destination,
        startingBalance: amount,
      });
    }
    // regular payment
    return StellarSdk.Operation.payment({
      destination,
      asset: sourceAsset,
      amount,
    });
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
      {submission.submitStatus === ActionStatus.PENDING && (
        <div className="TransactionDetails__processing">
          <Loader /> <span>Processing transaction</span>
        </div>
      )}
      <SubviewHeader
        title={
          submission.submitStatus === ActionStatus.SUCCESS
            ? `Sent ${sourceAsset.code}`
            : "Confirm Send"
        }
        customBackAction={goBack}
      />
      <div className="TransactionDetails__cards">
        <Card>
          <AccountAssets
            assetIcons={assetIcons}
            sortedBalances={[
              {
                token: { issuer: sourceAsset.issuer, code: sourceAsset.code },
                total: amount || "0",
              },
            ]}
          />
        </Card>
        {isPathPayment && (
          <Card>
            <AccountAssets
              assetIcons={destAssetIcons}
              sortedBalances={[
                {
                  token: {
                    issuer: destAsset.issuer,
                    code: destAsset.code,
                  },
                  total: destinationAmount || "0",
                },
              ]}
            />
          </Card>
        )}
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
      {isPathPayment && (
        <div className="TransactionDetails__row">
          <div>Conversion rate </div>
          <div className="TransactionDetails__row__right">
            1 {getAssetFromCanonical(asset).code} /{" "}
            {getConversionRate(amount, destinationAmount).toFixed(2)}{" "}
            {getAssetFromCanonical(destinationAsset).code}
          </div>
        </div>
      )}
      <div className="TransactionDetails__row">
        <div>Network Fee </div>
        <div className="TransactionDetails__row__right">
          {transactionFee} {sourceAsset.code}
        </div>
      </div>
      <div className="TransactionDetails__buttons-row">
        {submission.submitStatus === ActionStatus.SUCCESS ? (
          <Button
            fullWidth
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
              Cancel
            </Button>
            <Button onClick={handleSend}>Send</Button>
          </>
        )}
      </div>
    </div>
  );
};
