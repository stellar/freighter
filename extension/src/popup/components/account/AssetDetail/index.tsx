import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";
import { IconButton, Icon, Button } from "@stellar/design-system";

import { AssetToken, HorizonOperation } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import {
  getAvailableBalance,
  getIsDustPayment,
  getIsPayment,
  getIsSwap,
  getIssuerFromBalance,
  isSorobanIssuer,
} from "popup/helpers/account";
import { useAssetDomain } from "popup/helpers/useAssetDomain";
import { navigateTo } from "popup/helpers/navigate";
import { formatTokenAmount, isContractId } from "popup/helpers/soroban";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import { ROUTES } from "popup/constants/routes";

import {
  historyItemDetailViewProps,
  HistoryItem,
} from "popup/components/accountHistory/HistoryItem";
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
} from "popup/ducks/transactionSubmission";
import { settingsSelector } from "popup/ducks/settings";
import { AppDispatch } from "popup/App";
import StellarLogo from "popup/assets/stellar-logo.png";
import { formatAmount } from "popup/helpers/formatters";
import { isAssetSuspicious } from "popup/helpers/blockaid";
import { Loading } from "popup/components/Loading";
import {
  BlockaidAssetWarning,
  WarningMessage,
  WarningMessageVariant,
} from "popup/components/WarningMessages";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { getBalanceByIssuer } from "popup/helpers/balance";
import {
  AssetType,
  LiquidityPoolShareAsset,
  SorobanAsset,
} from "@shared/api/types/account-balance";
import { useGetOnrampToken } from "helpers/hooks/useGetOnrampToken";

import "./styles.scss";

interface AssetDetailProps {
  assetOperations: HorizonOperation[];
  accountBalances: AccountBalances;
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
  const navigate = useNavigate();
  const { isHideDustEnabled } = useSelector(settingsSelector);
  const USDC_ASSET =
    "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
  const isNative = selectedAsset === "native";
  const isUsdc = selectedAsset === USDC_ASSET;

  const isOnrampSupported = (isNative || isUsdc) && isMainnet(networkDetails);

  const canonical = getAssetFromCanonical(selectedAsset);
  const isSorobanAsset = canonical.issuer && isSorobanIssuer(canonical.issuer);

  const selectedBalance = getBalanceByIssuer(
    canonical.issuer,
    accountBalances.balances,
  ) as Exclude<AssetType, LiquidityPoolShareAsset | SorobanAsset>;
  const isSuspicious = isAssetSuspicious(selectedBalance.blockaidData);

  const assetIssuer = selectedBalance
    ? getIssuerFromBalance(selectedBalance)
    : "";
  const total =
    selectedBalance && "decimals" in selectedBalance
      ? formatTokenAmount(
          new BigNumber(selectedBalance.total || "0"),
          Number(selectedBalance.decimals),
        )
      : (selectedBalance && new BigNumber(selectedBalance?.total).toString()) ||
        "0";

  const balanceAvailable = getAvailableBalance({
    balance: selectedBalance,
    subentryCount,
  });

  const availableTotal = `${formatAmount(balanceAvailable)} ${canonical.code}`;
  const displayTotal = `${formatAmount(total)} ${canonical.code}`;

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
  const [onrampAsset, setOnrampAsset] = useState("");
  const {
    fetchData,
    isLoading: isTokenRequestLoading,
    tokenError,
    clearTokenError,
  } = useGetOnrampToken({
    publicKey,
    asset: onrampAsset,
  });

  const handleOnrampClick = async () => {
    let asset = "";
    if (isUsdc) {
      asset = "USDC";
    }

    if (isNative) {
      asset = "XLM";
    }
    setOnrampAsset(asset);
    await fetchData();
  };

  const { assetDomain, error: assetError } = useAssetDomain({
    assetIssuer,
  });

  const isContract = isContractId(assetIssuer);

  if (!assetOperations && !isSorobanAsset) {
    return null;
  }

  const sortedAssetOperations = assetOperations.filter((operation) => {
    const isDustPayment = getIsDustPayment(publicKey, operation);

    if (isDustPayment && isHideDustEnabled) {
      return false;
    }

    return true;
  });

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
        <div className="AssetDetail__wrapper" data-testid="AssetDetail">
          {selectedBalance && "name" in selectedBalance && (
            <span className="AssetDetail__token-name">
              {selectedBalance.name as string}
            </span>
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
                  selectedBalance &&
                  "token" in selectedBalance &&
                  "type" in selectedBalance.token
                    ? selectedBalance.token.type
                    : null
                }
                assetDomain={assetDomain}
                contractId={
                  selectedBalance && "decimals" in selectedBalance
                    ? (selectedBalance.token as AssetToken)?.issuer?.key
                    : undefined
                }
              />
            </div>
          </div>
          {isSuspicious ? null : (
            <div className="AssetDetail__actions">
              {selectedBalance?.total &&
              new BigNumber(selectedBalance?.total).toNumber() > 0 ? (
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
                      navigateTo(ROUTES.sendPayment, navigate);
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
                        navigateTo(ROUTES.swap, navigate);
                      }}
                    >
                      {t("SWAP")}
                    </Button>
                  )}
                  {isOnrampSupported && (
                    <Button
                      size="md"
                      variant="tertiary"
                      onClick={() => {
                        handleOnrampClick();
                      }}
                      isLoading={isTokenRequestLoading}
                    >
                      {t("BUY")}
                    </Button>
                  )}
                </>
              ) : (
                <Button
                  size="md"
                  variant="tertiary"
                  onClick={() => {
                    dispatch(saveDestinationAsset(selectedAsset));
                    navigateTo(ROUTES.swap, navigate);
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
                  selectedBalance.blockaidData || defaultBlockaidScanAssetResult
                }
              />
            )}
          </div>
          {sortedAssetOperations.length ? (
            <div className="AssetDetail__list" data-testid="AssetDetail__list">
              <>
                {sortedAssetOperations.map((operation) => {
                  const historyItemOperation = {
                    ...operation,
                    isPayment: getIsPayment(operation.type),
                    isSwap: getIsSwap(operation),
                  } as any; // TODO: isPayment/isSwap overload op type
                  return (
                    <HistoryItem
                      key={operation.id}
                      accountBalances={accountBalances}
                      operation={historyItemOperation}
                      publicKey={publicKey}
                      networkDetails={networkDetails}
                      setDetailViewProps={setDetailViewProps}
                      setIsDetailViewShowing={setIsDetailViewShowing}
                    />
                  );
                })}
              </>
            </div>
          ) : (
            <div
              className="AssetDetail__empty"
              data-testid="AssetDetail__empty"
            >
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
                {selectedBalance &&
                "available" in selectedBalance &&
                selectedBalance?.available &&
                selectedBalance?.total ? (
                  <div>
                    {formatAmount(
                      new BigNumber(balanceAvailable)
                        .minus(new BigNumber(selectedBalance?.total))
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
      {tokenError
        ? createPortal(
            <WarningMessage
              header={t("Error fetching Coinbase token. Please try again.")}
              isActive={!!tokenError}
              variant={WarningMessageVariant.warning}
              handleCloseClick={clearTokenError}
            >
              <div>{tokenError}</div>
            </WarningMessage>,
            document.querySelector("#modal-root")!,
          )
        : null}
    </React.Fragment>
  );
};
