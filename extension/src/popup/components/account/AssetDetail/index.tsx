import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";
import { IconButton, Icon } from "@stellar/design-system";

import { HorizonOperation, AssetType } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  getAvailableBalance,
  getIsPayment,
  getIsSupportedSorobanOp,
  getIsSwap,
  getStellarExpertUrl,
  getRawBalance,
  getIssuerFromBalance,
  isSorobanIssuer,
} from "popup/helpers/account";
import { useAssetDomain } from "popup/helpers/useAssetDomain";
import { navigateTo } from "popup/helpers/navigate";
import { formatTokenAmount } from "popup/helpers/soroban";
import { getAssetFromCanonical } from "helpers/stellar";
import { SimpleBarWrapper } from "popup/basics/SimpleBarWrapper";
import { ROUTES } from "popup/constants/routes";

import { PillButton } from "popup/basics/buttons/PillButton";

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
import {
  saveAsset,
  saveDestinationAsset,
} from "popup/ducks/transactionSubmission";
import { AppDispatch } from "popup/App";
import { useIsOwnedScamAsset } from "popup/helpers/useIsOwnedScamAsset";
import { InfoBlock } from "popup/basics/InfoBlock";
import StellarLogo from "popup/assets/stellar-logo.png";

import "./styles.scss";
import { formatAmount } from "popup/helpers/formatters";

interface AssetDetailProps {
  assetOperations: Array<HorizonOperation>;
  accountBalances: Array<AssetType>;
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
  const dispatch: AppDispatch = useDispatch();
  const isNative = selectedAsset === "native";

  const canonical = getAssetFromCanonical(selectedAsset);
  const isSorobanAsset = canonical.issuer && isSorobanIssuer(canonical.issuer);
  const isOwnedScamAsset = useIsOwnedScamAsset(
    canonical.code,
    canonical.issuer,
  );

  const balance = getRawBalance(accountBalances, selectedAsset) || null;
  const assetIssuer = balance ? getIssuerFromBalance(balance) : "";
  const total =
    balance && "contractId" in balance
      ? formatTokenAmount(
          new BigNumber(balance.total || "0"),
          Number(balance.decimals),
        )
      : (balance && new BigNumber(balance?.total).toString()) || "0";
  const balanceTotal = `${total} ${canonical.code}`;

  const balanceAvailable = getAvailableBalance({
    accountBalances,
    selectedAsset,
    subentryCount,
  });

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

  const { assetDomain } = useAssetDomain({
    assetIssuer,
  });

  if (!assetOperations && !isSorobanAsset) {
    return null;
  }

  if (assetIssuer && !assetDomain && !isSorobanAsset) {
    // if we have an asset issuer, wait until we have the asset domain before continuing
    return null;
  }

  return isDetailViewShowing ? (
    <TransactionDetail {...detailViewProps} />
  ) : (
    <div className="AssetDetail">
      <div className="AssetDetail__wrapper">
        <SubviewHeader
          title={canonical.code}
          customBackAction={() => setSelectedAsset("")}
        />
        {balance && "name" in balance && (
          <span className="AssetDetail__token-name">{balance.name}</span>
        )}
        {isNative ? (
          <div className="AssetDetail__available">
            <span className="AssetDetail__available__copy">
              {formatAmount(balanceAvailable)} {canonical.code} {t("available")}
            </span>
            <span
              className="AssetDetail__available__icon"
              onClick={() => setIsModalOpen(true)}
            >
              <IconButton altText="Available Info" icon={<Icon.Info />} />{" "}
            </span>
          </div>
        ) : null}
        <div className="AssetDetail__total">
          <div
            className="AssetDetail__total__copy"
            data-testid="asset-detail-available-copy"
          >
            {formatAmount(balanceTotal)}
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
                balance && "contractId" in balance
                  ? balance.contractId
                  : undefined
              }
            />
          </div>
        </div>
        <div className="AssetDetail__actions">
          {balance?.total && new BigNumber(balance?.total).toNumber() > 0 ? (
            <>
              {/* Hide send for Soroban until send work is ready for Soroban tokens */}
              {!isSorobanAsset && (
                <PillButton
                  onClick={() => {
                    dispatch(saveAsset(selectedAsset));
                    navigateTo(ROUTES.sendPayment);
                  }}
                >
                  {t("SEND")}
                </PillButton>
              )}
              {!isSorobanAsset && (
                <PillButton
                  onClick={() => {
                    dispatch(saveAsset(selectedAsset));
                    navigateTo(ROUTES.swap);
                  }}
                >
                  {t("SWAP")}
                </PillButton>
              )}
            </>
          ) : (
            <PillButton
              onClick={() => {
                dispatch(saveDestinationAsset(selectedAsset));
                navigateTo(ROUTES.swap);
              }}
            >
              {t("SWAP")}
            </PillButton>
          )}
        </div>
        <SimpleBarWrapper>
          <div className="AssetDetail__scam-warning">
            {isOwnedScamAsset && (
              <InfoBlock variant={InfoBlock.variant.error}>
                <div>
                  <p>
                    This asset was tagged as fraudulent by stellar.expert, a
                    reliable community-maintained directory.
                  </p>
                  <p>
                    Trading or sending this asset is not recommended. Projects
                    related to this asset may be fraudulent even if the creators
                    say otherwise.
                  </p>
                </div>
              </InfoBlock>
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
                  };

                  const tokenBalances =
                    balance &&
                    "contractId" in balance &&
                    getIsSupportedSorobanOp(operation, networkDetails)
                      ? [balance]
                      : [];
                  return (
                    <HistoryItem
                      key={operation.id}
                      tokenBalances={tokenBalances}
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
        </SimpleBarWrapper>
      </div>
      {isNative && (
        <SlideupModal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen}>
          <div className="AssetDetail__info-modal">
            <div className="AssetDetail__info-modal__total-box">
              <div className="AssetDetail__info-modal__asset-code">
                <img src={StellarLogo} alt="Network icon" />{" "}
                <div>{canonical.code}</div>
              </div>
              <div>{formatAmount(balanceTotal)}</div>
            </div>
            <div className="AssetDetail__info-modal__available-box">
              <div className="AssetDetail__info-modal__balance-row">
                <div>{t("Total Balance")}</div>
                <div>{formatAmount(balanceTotal)}</div>
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
                <div>
                  {formatAmount(balanceAvailable)} {canonical.code}
                </div>
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
    </div>
  );
};
