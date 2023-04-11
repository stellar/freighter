import React, { useContext, useState, useEffect } from "react";

import { useDispatch, useSelector } from "react-redux";
import BigNumber from "bignumber.js";
import StellarSdk from "stellar-sdk";
import SorobanClient from "soroban-client";
import { Types } from "@stellar/wallet-sdk";
import { Card, Loader, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { SorobanContext } from "popup/SorobanContext";
import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isMuxedAccount,
  xlmToStroop,
  getConversionRate,
  truncatedFedAddress,
  isCustomNetwork,
} from "helpers/stellar";
import { getStellarExpertUrl } from "popup/helpers/account";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { AssetIcons, ActionStatus } from "@shared/api/types";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import { accountIdentifier, numberToI128 } from "@shared/api/helpers/soroban";

import { Button } from "popup/basics/buttons/Button";
import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import {
  signFreighterTransaction,
  signFreighterSorobanTransaction,
  submitFreighterTransaction,
  submitFreighterSorobanTransaction,
  transactionSubmissionSelector,
  addRecentAddress,
  isPathPaymentSelector,
  ShowOverlayStatus,
  startHwSign,
} from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { sorobanSelector } from "popup/ducks/soroban";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
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
import { LedgerSign } from "popup/components/hardwareConnect/LedgerSign";
import { useIsOwnedScamAsset } from "popup/helpers/useIsOwnedScamAsset";
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";

import "./styles.scss";
import { parseTokenAmount } from "popup/helpers/soroban";

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

  const isSourceAssetScam = useIsOwnedScamAsset(
    sourceAsset.code,
    sourceAsset.issuer,
  );
  const isDestAssetScam = useIsOwnedScamAsset(destAsset.code, destAsset.issuer);

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
          <ScamAssetIcon isScamAsset={isSourceAssetScam} />
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
          <ScamAssetIcon isScamAsset={isDestAssetScam} />
        </div>
        <div className="TwoAssetCard__row__right">
          {new BigNumber(destAmount).toFixed()} {destAsset.code}
        </div>
      </div>
    </div>
  );
};

export const TransactionDetails = ({ goBack }: { goBack: () => void }) => {
  const sorobanClient = useContext(SorobanContext);
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
      isToken,
    },
    assetIcons,
    hardwareWalletData: { status: hwStatus },
  } = submission;

  const transactionHash = submission.response?.hash;
  const isPathPayment = useSelector(isPathPaymentSelector);
  const { tokenBalances } = useSelector(sorobanSelector);
  const isSwap = useIsSwap();

  const { t } = useTranslation();

  const { server: sorobanServer } = useContext(SorobanContext);

  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!hardwareWalletType;
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

  const handleXferTransaction = async () => {
    try {
      const assetAddress = asset.split(":")[1];
      const assetBalance = tokenBalances.find(
        (b) => b.contractId === assetAddress,
      );

      if (!assetBalance) {
        throw new Error("Asset Balance not available");
      }

      const parsedAmount = parseTokenAmount(
        amount,
        Number(assetBalance.decimals),
      );

      const sourceAccount = await sorobanServer.getAccount(publicKey);
      const contract = new SorobanClient.Contract(assetAddress);
      const contractOp = contract.call(
        "xfer",
        ...[
          accountIdentifier(publicKey), // from
          accountIdentifier(destination), // to
          numberToI128(parsedAmount.toNumber()), // amount
        ],
      );

      const transaction = await new SorobanClient.TransactionBuilder(
        sourceAccount,
        {
          fee: xlmToStroop(transactionFee).toFixed(),
          networkPassphrase: networkDetails.networkPassphrase,
        },
      )
        .addOperation(contractOp)
        .addMemo(SorobanClient.Memo.text(memo))
        .setTimeout(180)
        .build();

      const preparedTransaction = await sorobanServer.prepareTransaction(
        transaction,
        networkDetails.networkPassphrase,
      );

      const res = await dispatch(
        signFreighterSorobanTransaction({
          transactionXDR: preparedTransaction.toXDR(),
          network: networkDetails.networkPassphrase,
        }),
      );

      if (
        signFreighterSorobanTransaction.fulfilled.match(res) &&
        res.payload.signedTransaction
      ) {
        const submitResp = await dispatch(
          submitFreighterSorobanTransaction({
            signedXDR: res.payload.signedTransaction,
            networkDetails,
            sorobanClient,
            refreshBalances: true,
          }),
        );

        if (submitFreighterTransaction.fulfilled.match(submitResp)) {
          emitMetric(METRIC_NAMES.sendPaymentSuccess, { sourceAsset });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePaymentTransaction = async () => {
    try {
      const server = stellarSdkServer(networkDetails.networkUrl);
      const sourceAccount: Types.Account = await server.loadAccount(publicKey);

      const transactionXDR = await new StellarSdk.TransactionBuilder(
        sourceAccount,
        {
          fee: xlmToStroop(transactionFee).toFixed(),
          networkPassphrase: networkDetails.networkPassphrase,
        },
      )
        .addOperation(getOperation())
        .addMemo(StellarSdk.Memo.text(memo))
        .setTimeout(180)
        .build()
        .toXDR();

      if (isHardwareWallet) {
        dispatch(startHwSign({ transactionXDR, shouldSubmit: true }));
        return;
      }
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
        const submitResp = await dispatch(
          submitFreighterTransaction({
            publicKey,
            signedXDR: res.payload.signedTransaction,
            networkDetails,
            refreshBalances: true,
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

  // handles signing and submitting
  const handleSend = async () => {
    if (isToken) {
      await handleXferTransaction();
    } else {
      await handlePaymentTransaction();
    }
  };

  const showMemo = !isSwap && !isMuxedAccount(destination);

  const StellarExpertButton = () =>
    !isCustomNetwork(networkDetails) && !isToken ? (
      <Button
        fullWidth
        variant={Button.variant.tertiary}
        onClick={() =>
          openTab(
            `${getStellarExpertUrl(networkDetails)}/tx/${transactionHash}`,
          )
        }
      >
        {t("View on")} Stellar.expert
      </Button>
    ) : null;

  return (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && <LedgerSign />}
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
              ? `${isSwap ? t("Swapped") : t("Sent")} ${
                  isToken ? asset.split(":")[0] : sourceAsset.code
                }`
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
            <div>{t("Memo")}</div>
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
            {transactionFee} XLM
          </div>
        </div>
        {isSwap && (
          <div className="TransactionDetails__row">
            <div>{t("Minimum Received")} </div>
            <div className="TransactionDetails__row__right">
              {computeDestMinWithSlippage(
                allowedSlippage,
                destinationAmount,
              ).toFixed()}{" "}
              {destAsset.code}
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
            <StellarExpertButton />
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
              <Button
                onClick={handleSend}
                isLoading={hwStatus === ShowOverlayStatus.IN_PROGRESS}
              >
                {isSwap ? t("Swap") : t("Send")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
