import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";
import { IconButton, Icon, Button } from "@stellar/design-system";

import { HorizonOperation, AssetType } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import {
  getAvailableBalance,
  getIsPayment,
  getIsSwap,
  getStellarExpertUrl,
  getRawBalance,
  getIssuerFromBalance,
  isSorobanIssuer,
} from "popup/helpers/account";
import { useAssetDomain } from "popup/helpers/useAssetDomain";
import { navigateTo } from "popup/helpers/navigate";
import { formatTokenAmount, isContractId } from "popup/helpers/soroban";
import { getAssetFromCanonical } from "helpers/stellar";
import { ROUTES } from "popup/constants/routes";

import {
  historyItemDetailViewProps,
  HistoryItem,
} from "popup/components/accountHistory/HistoryItem";
import { HistoryList } from "popup/components/accountHistory/HistoryList";
import { AssetNetworkInfo } from "popup/components/accountHistory/AssetNetworkInfo";
import {
  TransactionDetail,
  TransactionDetailProps,
} from "popup/components/accountHistory/TransactionDetail";
import { SlideupModal } from "popup/components/SlideupModal";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import {
  saveAsset,
  saveDestinationAsset,
  saveIsToken,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { AppDispatch } from "popup/App";
import StellarLogo from "popup/assets/stellar-logo.png";
import { formatAmount } from "popup/helpers/formatters";
import { isAssetSuspicious } from "popup/helpers/blockaid";
import { Loading } from "popup/components/Loading";
import { BlockaidAssetWarning } from "popup/components/WarningMessages";

import "./styles.scss";

interface AssetDetailProps {
  assetOperations: HorizonOperation[];
  accountBalances: AssetType[];
  networkDetails: NetworkDetails;
  publicKey: string;
  selectedAsset: string;
  subentryCount: number;
  setSelectedAsset: (selectedAsset: string) => void;
}

export const AssetDetail = ({
  assetOperations,
  accountBalances,
  networkDetails,
  publicKey,
  selectedAsset,
  setSelectedAsset,
  subentryCount,
}: AssetDetailProps) => {
  const dispatch: AppDispatch = useDispatch<AppDispatch>();
  const isNative = selectedAsset === "native";

  const canonical = getAssetFromCanonical(selectedAsset);
  const isSorobanAsset = canonical.issuer && isSorobanIssuer(canonical.issuer);

  const { accountBalances: balances } = useSelector(
    transactionSubmissionSelector,
  );
  const isSuspicious = isAssetSuspicious(
    balances.balances?.[selectedAsset]?.blockaidData,
  );

  const balance = getRawBalance(accountBalances, selectedAsset)!;

  const assetIssuer = balance ? getIssuerFromBalance(balance) : "";
  const total =
    balance && "decimals" in balance
      ? formatTokenAmount(
          new BigNumber(balance.total || "0"),
          Number(balance.decimals),
        )
      : (balance && new BigNumber(balance?.total).toString()) || "0";

  const balanceAvailable = getAvailableBalance({
    accountBalances,
    selectedAsset,
    subentryCount,
  });

  const availableTotal = `${formatAmount(balanceAvailable)} ${canonical.code}`;
  const displayTotal = `${formatAmount(total)} ${canonical.code}`;

  const stellarExpertUrl = getStellarExpertUrl(networkDetails);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailViewShowing, setIsDetailViewShowing] = useState(false);

  const { t } = useTranslation();

  const defaultDetailViewProps: TransactionDetailProps = {
    ...historyItemDetailViewProps,
    setIsDetailViewShowing,
  };
  const [detailViewProps, setDetailViewProps] = useState(
    defaultDetailViewProps,
  );

  const { assetDomain, error: assetError } = useAssetDomain({
    assetIssuer,
  });

  const isContract = isContractId(assetIssuer);

  if (!assetOperations && !isSorobanAsset) {
    return null;
  }

  if (assetIssuer && !assetDomain && !assetError && !isSorobanAsset) {
    // if we have an asset issuer, wait until we have the asset domain before continuing
    return <Loading />;
  }

  return isDetailViewShowing ? (
    <TransactionDetail {...detailViewProps} />
  ) : (
    <React.Fragment>
      <SubviewHeader
        title={canonical.code}
        subtitle={
          isNative ? (
            <div className="AssetDetail__available">
              <span className="AssetDetail__available__copy">
                {availableTotal} {t("available")}
              </span>
              <span
                className="AssetDetail__available__icon"
                onClick={() => setIsModalOpen(true)}
              >
                <IconButton
                  altText="Available Info"
                  icon={<Icon.InfoCircle />}
                />{" "}
              </span>
            </div>
          ) : null
        }
        customBackAction={() => setSelectedAsset("")}
      />
      <View.Content>
        <div className="AssetDetail__wrapper">
          {balance && "name" in balance && (
            <span className="AssetDetail__token-name">{balance.name}</span>
          )}
          <div className="AssetDetail__total">
            <div
              className={`AssetDetail__total__copy ${
                isSuspicious ? "AssetDetail__total__copy--isSuspicious" : ""
              }`}
              data-testid="asset-detail-available-copy"
            >
              {displayTotal}
            </div>
            <div className="AssetDetail__total__network">
              <AssetNetworkInfo
                assetCode={canonical.code}
                assetIssuer={assetIssuer}
                assetType={
                  (balance && "token" in balance && balance?.token.type) || ""
                }
                assetDomain={assetDomain}
                contractId={
                  balance && "decimals" in balance
                    ? balance.token.issuer.key
                    : undefined
                }
              />
            </div>
          </div>
          {isSuspicious ? null : (
            <div className="AssetDetail__actions">
              {balance?.total &&
              new BigNumber(balance?.total).toNumber() > 0 ? (
                <>
                  <Button
                    size="md"
                    variant="tertiary"
                    onClick={() => {
                      dispatch(saveAsset(selectedAsset));
                      if (isContract) {
                        dispatch(saveIsToken(true));
                      } else {
                        dispatch(saveIsToken(false));
                      }
                      navigateTo(ROUTES.sendPayment);
                    }}
                  >
                    {t("SEND")}
                  </Button>
                  {!isSorobanAsset && (
                    <Button
                      size="md"
                      variant="tertiary"
                      onClick={() => {
                        dispatch(saveAsset(selectedAsset));
                        navigateTo(ROUTES.swap);
                      }}
                    >
                      {t("SWAP")}
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  size="md"
                  variant="tertiary"
                  onClick={() => {
                    dispatch(saveDestinationAsset(selectedAsset));
                    navigateTo(ROUTES.swap);
                  }}
                >
                  {t("SWAP")}
                </Button>
              )}
            </div>
          )}
          <div className="AssetDetail__scam-warning">
            {isSuspicious && (
              <BlockaidAssetWarning
                blockaidData={
                  balances.balances?.[selectedAsset]?.blockaidData ||
                  defaultBlockaidScanAssetResult
                }
              />
            )}
          </div>

          {assetOperations.length ? (
            <HistoryList assetDetail>
              <>
                {assetOperations.map((operation) => {
                  const historyItemOperation = {
                    ...operation,
                    isPayment: getIsPayment(operation.type),
                    isSwap: getIsSwap(operation),
                  } as any; // TODO: isPayment/isSwap overload op type
                  return (
                    <HistoryItem
                      key={operation.id}
                      accountBalances={balances}
                      operation={historyItemOperation}
                      publicKey={publicKey}
                      url={stellarExpertUrl}
                      networkDetails={networkDetails}
                      setDetailViewProps={setDetailViewProps}
                      setIsDetailViewShowing={setIsDetailViewShowing}
                    />
                  );
                })}
              </>
            </HistoryList>
          ) : (
            <div className="AssetDetail__empty">
              {t("No transactions to show")}
            </div>
          )}
        </div>
      </View.Content>
      {/* TODO: fix the slideup modal */}
      {isNative && (
        <SlideupModal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}>
          <div className="AssetDetail__info-modal">
            <div className="AssetDetail__info-modal__total-box">
              <div className="AssetDetail__info-modal__asset-code">
                <img src={StellarLogo} alt="Network icon" />{" "}
                <div>{canonical.code}</div>
              </div>
              <div>{displayTotal}</div>
            </div>
            <div className="AssetDetail__info-modal__available-box">
              <div className="AssetDetail__info-modal__balance-row">
                <div>{t("Total Balance")}</div>
                <div>{displayTotal}</div>
              </div>
              <div className="AssetDetail__info-modal__balance-row">
                <div>{t("Reserved Balance*")}</div>
                {balance &&
                "available" in balance &&
                balance?.available &&
                balance?.total ? (
                  <div>
                    {formatAmount(
                      new BigNumber(balanceAvailable)
                        .minus(new BigNumber(balance?.total))
                        .toString(),
                    )}{" "}
                    {canonical.code}
                  </div>
                ) : null}
              </div>
              <div className="AssetDetail__info-modal__total-available-row">
                <div>{t("Total Available")}</div>
                <div>{availableTotal}</div>
              </div>
            </div>
            <div className="AssetDetail__info-modal__footnote">
              {t(
                "* All Stellar accounts must maintain a minimum balance of lumens.",
              )}{" "}
              <a
                href="https://developers.stellar.org/docs/glossary/minimum-balance/"
                target="_blank"
                rel="noreferrer"
              >
                {t("Learn More")}
              </a>
            </div>
          </div>
        </SlideupModal>
      )}
    </React.Fragment>
  );
};
