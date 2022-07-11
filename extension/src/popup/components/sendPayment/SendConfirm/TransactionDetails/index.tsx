import React, { useState, useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";
import BigNumber from "bignumber.js";
import StellarSdk from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";
import { Card, Loader, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isMuxedAccount,
  xlmToStroop,
  getConversionRate,
  truncatedFedAddress,
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
  isPathPaymentSelector,
} from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { useIsSwap } from "popup/helpers/useIsSwap";
import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { FedOrGAddress } from "popup/basics/sendPayment/FedOrGAddress";
import {
  AccountAssets,
  AssetIcon,
} from "popup/components/account/AccountAssets";

import "./styles.scss";

const TwoAssetCard = ({
  sourceAssetIcons,
  sourceCanon,
  sourceAmount,
  destAssetIcons,
  destCanon,
  destAmount,
}: {
  sourceAssetIcons: AssetIcons;
  sourceCanon: string;
  sourceAmount: string;
  destAssetIcons: AssetIcons;
  destCanon: string;
  destAmount: string;
}) => {
  const sourceAsset = getAssetFromCanonical(sourceCanon);
  const destAsset = getAssetFromCanonical(destCanon);

  return (
    <div className="TwoAssetCard">
      <div className="TwoAssetCard__row">
        <div className="TwoAssetCard__row__left">
          <AssetIcon
            assetIcons={sourceAssetIcons}
            code={sourceAsset.code}
            issuerKey={sourceAsset.issuer}
          />
          {sourceAsset.code}
        </div>
        <div className="TwoAssetCard__row__right">
          {sourceAmount} {sourceAsset.code}
        </div>
      </div>
      <div className="TwoAssetCard__arrow-icon">
        <Icon.ArrowDown />
      </div>
      <div className="TwoAssetCard__row">
        <div className="TwoAssetCard__row__left">
          <AssetIcon
            assetIcons={destAssetIcons}
            code={destAsset.code}
            issuerKey={destAsset.issuer}
          />
          {destAsset.code}
        </div>
        <div className="TwoAssetCard__row__right">
          {new BigNumber(destAmount).toFixed(2)} {destAsset.code}
        </div>
      </div>
    </div>
  );
};

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
  const isSwap = useIsSwap();
  const { t } = useTranslation();

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
      setDestAssetIcons({
        [getCanonicalFromAsset(destAsset.code, destAsset.issuer)]: iconURL,
      });
    })();
  }, [destAsset.code, destAsset.issuer, networkDetails]);

  const computeDestMinWithSlippage = (
    slippage: string,
    destMin: string,
  ): BigNumber => {
    const mult = 1 - parseFloat(slippage) / 100;
    return new BigNumber(destMin).times(new BigNumber(mult));
  };

  const getOperation = () => {
    // path payment or swap
    if (isPathPayment || isSwap) {
      const destMin = computeDestMinWithSlippage(
        allowedSlippage,
        destinationAmount,
      );
      return StellarSdk.Operation.pathPaymentStrictSend({
        sendAsset: sourceAsset,
        sendAmount: amount,
        destination: isSwap ? publicKey : destination,
        destAsset,
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
          if (!isSwap) {
            await dispatch(
              addRecentAddress({ publicKey: federationAddress || destination }),
            );
          }
          if (isPathPayment) {
            emitMetric(METRIC_NAMES.sendPaymentPathPaymentSuccess, {
              sourceAsset,
              destAsset,
              allowedSlippage,
            });
          } else {
            emitMetric(METRIC_NAMES.sendPaymentSuccess, { sourceAsset });
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const showMemo = !isSwap && !isMuxedAccount(destination);

  return (
    <div className="TransactionDetails">
      {submission.submitStatus === ActionStatus.PENDING && (
        <div className="TransactionDetails__processing">
          <div className="TransactionDetails__processing__header">
            <Loader />{" "}
            <span>
              {t("Processing")} {isSwap ? t("swap") : t("transaction")}
            </span>
          </div>
          <div className="TransactionDetails__processing__copy">
            {t("Please don’t close this window")}
          </div>
        </div>
      )}
      <SubviewHeader
        title={
          submission.submitStatus === ActionStatus.SUCCESS
            ? `${isSwap ? t("Swapped") : t("Sent")} ${sourceAsset.code}`
            : `${isSwap ? t("Confirm Swap") : t("Confirm Send")}`
        }
        customBackAction={goBack}
        customBackIcon={
          submission.submitStatus === ActionStatus.SUCCESS ? <Icon.X /> : null
        }
      />
      {!(isPathPayment || isSwap) && (
        <div className="TransactionDetails__cards">
          <Card>
            <AccountAssets
              assetIcons={assetIcons}
              sortedBalances={[
                {
                  token: {
                    issuer: { key: sourceAsset.issuer },
                    code: sourceAsset.code,
                  },
                  total: amount || "0",
                },
              ]}
            />
          </Card>
        </div>
      )}

      {(isPathPayment || isSwap) && (
        <TwoAssetCard
          sourceAssetIcons={assetIcons}
          sourceCanon={asset}
          sourceAmount={amount}
          destAssetIcons={destAssetIcons}
          destCanon={destinationAsset || "native"}
          destAmount={destinationAmount}
        />
      )}

      {!isSwap && (
        <div className="TransactionDetails__row">
          <div>{t("Sending to")} </div>
          <div className="TransactionDetails__row__right">
            <div className="TransactionDetails__identicon">
              <FedOrGAddress
                fedAddress={truncatedFedAddress(federationAddress)}
                gAddress={destination}
              />
            </div>
          </div>
        </div>
      )}
      {showMemo && (
        <div className="TransactionDetails__row">
          <div>Memo</div>
          <div className="TransactionDetails__row__right">
            {memo || t("None")}
          </div>
        </div>
      )}

      {(isPathPayment || isSwap) && (
        <div className="TransactionDetails__row">
          <div>{t("Conversion rate")} </div>
          <div className="TransactionDetails__row__right">
            1 {sourceAsset.code} /{" "}
            {getConversionRate(amount, destinationAmount).toFixed(2)}{" "}
            {destAsset.code}
          </div>
        </div>
      )}
      <div className="TransactionDetails__row">
        <div>{t("Transaction fee")} </div>
        <div className="TransactionDetails__row__right">
          {transactionFee} {sourceAsset.code}
        </div>
      </div>
      {isSwap && (
        <div className="TransactionDetails__row">
          <div>{t("Minimum Received")} </div>
          <div className="TransactionDetails__row__right">
            {computeDestMinWithSlippage(
              allowedSlippage,
              destinationAmount,
            ).toFixed(2)}{" "}
            {sourceAsset.code}
          </div>
        </div>
      )}
      <div className="TransactionDetails__bottom-wrapper">
        <div className="TransactionDetails__bottom-wrapper__copy">
          {(isPathPayment || isSwap) &&
            submission.submitStatus !== ActionStatus.SUCCESS &&
            t("The final amount is approximate and may change")}
        </div>
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
            {t("View on")} Stellar.expert
          </Button>
        ) : (
          <div className="TransactionDetails__bottom-wrapper__buttons">
            <Button
              variant={Button.variant.tertiary}
              onClick={() => {
                navigateTo(ROUTES.account);
              }}
            >
              {t("Cancel")}
            </Button>
            <Button onClick={handleSend}>
              {isSwap ? t("Swap") : t("Send")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
