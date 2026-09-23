import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Button,
  CopyText,
  Icon,
  Link,
  Loader,
  Notification,
} from "@stellar/design-system";

import { NetworkDetails } from "@shared/constants/stellar";
import {
  isNativeAssetId,
  isNativeBalance,
} from "@shared/helpers/assetIdentity";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";
import {
  displaySorobanId,
  getAvailableBalance,
  getIssuerFromBalance,
  isSorobanIssuer,
} from "popup/helpers/account";
import { useAssetDomain } from "popup/helpers/useAssetDomain";
import { formatTokenAmount } from "popup/helpers/soroban";
import {
  getAssetFromCanonical,
  isMainnet,
  isTestnet,
  truncateString,
} from "helpers/stellar";

import { HistoryItem } from "popup/components/accountHistory/HistoryItem";
import { TransactionDetail } from "popup/components/accountHistory/TransactionDetail";
import { SlideupModal } from "popup/components/SlideupModal";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "popup/basics/shadcn/Popover";
import { changeAssetVisibility } from "@shared/api/internal";
import { saveHiddenAssets } from "popup/ducks/hiddenAssets";
import { getIsRemovable } from "popup/helpers/balance";
import { isAssetSac } from "popup/helpers/soroban";
import { ChangeTrustInternal } from "popup/components/manageAssets/ManageAssetRows/ChangeTrustInternal";
import { ToggleTokenInternal } from "popup/components/manageAssets/ManageAssetRows/ToggleTokenInternal";
import { InfoBottomSheet } from "popup/components/InfoBottomSheet";
import { AppDispatch } from "popup/App";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import StellarLogo from "popup/assets/stellar-logo.png";
import {
  NO_FIAT_VALUE,
  formatAmount,
  roundUsdValue,
} from "popup/helpers/formatters";
import { Loading } from "popup/components/Loading";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { title } from "helpers/transaction";
import {
  getBalanceByAsset,
  getPriceDeltaColor,
  isSorobanBalance,
} from "popup/helpers/balance";
import { CopyValue } from "popup/components/CopyValue";
import {
  AssetType,
  LiquidityPoolShareAsset,
} from "@shared/api/types/account-balance";
import { OperationDataRow } from "popup/views/AccountHistory/hooks/useGetHistoryData";
import { navigateTo } from "popup/helpers/navigate";
import { ROUTES } from "popup/constants/routes";
import { AccountHistoryData } from "popup/views/Account/hooks/useGetAccountHistoryData";
import { publicKeySelector } from "popup/ducks/accountServices";
import { iconsSelector, tokenPricesSelector } from "popup/ducks/cache";
import { AppDataType } from "helpers/hooks/useGetAppData";

import "./styles.scss";

const AssetDetailOperations = ({
  filteredAssetOperations,
  accountBalances,
  publicKey,
  networkDetails,
  setActiveAssetId,
}: {
  filteredAssetOperations: OperationDataRow[];
  accountBalances: AccountBalances;
  publicKey: string;
  networkDetails: NetworkDetails;
  setActiveAssetId: (id: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <>
      {filteredAssetOperations.length ? (
        <div className="AssetDetail__list" data-testid="AssetDetail__list">
          <>
            {filteredAssetOperations.map((operation) => (
              <HistoryItem
                key={operation.id}
                accountBalances={accountBalances}
                operation={operation}
                publicKey={publicKey}
                networkDetails={networkDetails}
                setActiveHistoryDetailId={() => setActiveAssetId(operation.id)}
              />
            ))}
          </>
        </div>
      ) : (
        <div className="AssetDetail__empty" data-testid="AssetDetail__empty">
          {t("No transactions to show")}
        </div>
      )}
    </>
  );
};

interface AssetDetailProps {
  accountBalances: AccountBalances;
  historyData: AccountHistoryData | null;
  selectedAsset: string;
  handleClose: () => void;
}

export const AssetDetail = ({
  accountBalances,
  historyData,
  selectedAsset,
  handleClose,
}: AssetDetailProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const cachedTokenPrices = useSelector(tokenPricesSelector);
  const assetIcons = useSelector(iconsSelector);
  const { isHideDustEnabled } = useSelector(settingsSelector);
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  const isNative = isNativeAssetId(selectedAsset);
  const canonical = getAssetFromCanonical(selectedAsset);

  const reduxDispatch = useDispatch<AppDispatch>();
  const [isHiding, setIsHiding] = useState(false);
  // Which body this sheet is showing. The remove flow renders in place rather
  // than in a nested SlideupModal: SlideupModal is z-30 against this Radix
  // Sheet's z-50, and View sets id="layout-view" on every instance, so
  // ManageAssetRows' portal target would resolve to Home's View, outside the
  // sheet entirely.
  const [body, setBody] = useState<"detail" | "remove">("detail");
  const [isBalanceWarningOpen, setIsBalanceWarningOpen] = useState(false);

  const handleHideAsset = async () => {
    setIsHiding(true);
    try {
      const { hiddenAssets, error } = await changeAssetVisibility({
        assetKey: selectedAsset,
        assetVisibility: "hidden",
        activePublicKey: publicKey,
      });

      if (error) {
        throw new Error(error);
      }

      reduxDispatch(
        saveHiddenAssets({
          publicKey,
          networkName: networkDetails.networkName,
          hiddenAssets,
        }),
      );
      setOptionsOpen(false);
      // The asset is gone from the list behind this sheet, so there is nothing
      // left to return to.
      handleClose();
      toast.custom(() => (
        <Notification
          variant="success"
          title={t("{{code}} hidden", { code: canonical.code })}
        />
      ));
    } catch (e) {
      setOptionsOpen(false);
      toast.custom(() => (
        <Notification
          variant="error"
          title={t("Unable to hide {{code}}", { code: canonical.code })}
        />
      ));
    } finally {
      setIsHiding(false);
    }
  };

  const tokenPrices =
    cachedTokenPrices[networkDetails.networkPassphrase]?.[publicKey] || null;
  const isSorobanAsset = canonical.issuer && isSorobanIssuer(canonical.issuer);

  const selectedBalance = getBalanceByAsset(
    canonical,
    accountBalances.balances,
  ) as Exclude<AssetType, LiquidityPoolShareAsset>;

  const icons = assetIcons || {};
  const assetIconUrl = isNativeBalance(selectedBalance)
    ? StellarLogo
    : icons[selectedAsset];
  const assetPrice = tokenPrices ? tokenPrices[selectedAsset] : null;
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
    subentryCount: accountBalances.subentryCount,
  });

  const availableTotal = `${formatAmount(balanceAvailable)} ${canonical.code}`;
  const displayTotal = `${formatAmount(total)} ${canonical.code}`;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeAssetId, setActiveAssetId] = useState<string | null>(null);

  const { assetDomain, error: assetError } = useAssetDomain({
    assetIssuer,
  });

  if (historyData?.type === AppDataType.REROUTE) {
    return null;
  }

  const assetOperations =
    historyData?.operationsByAsset?.[selectedAsset] || null;

  let filteredAssetOperations = null;
  let activeOperation = null;

  if (assetOperations) {
    filteredAssetOperations = assetOperations.filter((operation) => {
      if (operation.metadata.isDustPayment && isHideDustEnabled) {
        return false;
      }

      return true;
    });
    activeOperation =
      filteredAssetOperations.find((op) => op.id === activeAssetId) || null;
  }

  if (assetIssuer && !assetDomain && !assetError && !isSorobanAsset) {
    // if we have an asset issuer, wait until we have the asset domain before continuing
    return <Loading />;
  }

  const isStellarExpertSupported =
    isMainnet(networkDetails) || isTestnet(networkDetails);
  const stellarExpertAssetLinkSlug = isSorobanBalance(selectedBalance)
    ? `contract/${selectedBalance.contractId}`
    : `asset/${selectedAsset.replace(":", "-")}`;

  const isLpShare = "liquidityPoolId" in selectedBalance;

  const assetContract = isSorobanBalance(selectedBalance)
    ? selectedBalance.contractId
    : "";
  const isSac = assetContract
    ? isAssetSac({
        asset: {
          code: canonical.code,
          issuer: canonical.issuer,
          contract: assetContract,
        },
        networkDetails,
      })
    : false;
  const isRemovable = getIsRemovable({
    contract: assetContract,
    isSac,
    isNative: isNativeBalance(selectedBalance),
    isLiquidityPool: isLpShare,
    localOnlyTokenIds: accountBalances.localOnlyTokenIds,
  });
  // Same split ManageAssetRows uses: a classic asset or SAC closes a trustline,
  // a custom token just leaves the local token list.
  const shouldChangeTrust = !assetContract || isSac;
  const removeAsset = {
    code: canonical.code,
    // Only a native balance has no issuer, and native is never removable.
    issuer: canonical.issuer || "",
    image: assetIconUrl || null,
    domain: assetDomain || null,
    contract: assetContract || undefined,
  };
  const hasBalance =
    selectedBalance?.total &&
    new BigNumber(selectedBalance.total).isGreaterThan(0);
  const isShowingSwap = !isSorobanAsset && !isLpShare;
  const isShowingSend = hasBalance;

  return activeAssetId ? (
    <SlideupModal
      isModalOpen={activeOperation !== null}
      setIsModalOpen={() => setActiveAssetId(null)}
    >
      <TransactionDetail
        activeOperation={activeOperation}
        networkDetails={networkDetails}
      />
    </SlideupModal>
  ) : (
    <React.Fragment>
      <View>
        <SubviewHeader
          title={canonical.code}
          customBackIcon={<Icon.X />}
          customBackAction={handleClose}
          rightButton={
            // Native XLM has no address to copy and cannot be hidden
            // (filterHiddenBalances always keeps it), so on a network without
            // stellar.expert it would be an empty menu.
            !isStellarExpertSupported &&
            isNativeBalance(selectedBalance) ? null : (
              <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
                <PopoverTrigger
                  asChild
                  className="AssetDetail__options"
                  onClick={() => setOptionsOpen(true)}
                >
                  <img src={IconEllipsis} alt={t("asset options")} />
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="AssetDetail__options-actions"
                >
                  {!isNativeBalance(selectedBalance) && !isLpShare ? (
                    <div className="AssetDetail__options-actions__row">
                      <CopyText
                        textToCopy={
                          isSorobanBalance(selectedBalance)
                            ? selectedBalance.contractId
                            : selectedBalance.token.issuer.key
                        }
                      >
                        <div className="action">
                          <div className="AssetDetail__options-actions__label">
                            {t("Copy address")}
                          </div>
                          <Icon.Copy01 />
                        </div>
                      </CopyText>
                    </div>
                  ) : null}
                  {isStellarExpertSupported ? (
                    <div className="AssetDetail__options-actions__row">
                      <Link
                        className="action link"
                        variant="secondary"
                        rel="noreferrer"
                        target="_blank"
                        href={`https://stellar.expert/explorer/${networkDetails.network.toLowerCase()}/${stellarExpertAssetLinkSlug}`}
                      >
                        <>
                          <div className="AssetDetail__options-actions__label">
                            Stellar.expert
                          </div>
                          <Icon.LinkExternal01 />
                        </>
                      </Link>
                    </div>
                  ) : null}
                  {!isNativeBalance(selectedBalance) && !isLpShare ? (
                    <div className="AssetDetail__options-actions__row">
                      <div
                        className="action"
                        onClick={isHiding ? undefined : handleHideAsset}
                        data-testid="asset-detail-hide-button"
                      >
                        <div className="AssetDetail__options-actions__label">
                          {t("Hide {{code}}", { code: canonical.code })}
                        </div>
                        <Icon.EyeOff />
                      </div>
                    </div>
                  ) : null}
                  {isRemovable ? (
                    <div className="AssetDetail__options-actions__row AssetDetail__options-actions__row--destructive">
                      <div
                        className="action"
                        onClick={() => {
                          setOptionsOpen(false);
                          // Closing a trustline requires a zero balance, so
                          // entering the flow with one held could only ever
                          // fail on submit. Explain instead.
                          if (shouldChangeTrust && hasBalance) {
                            setIsBalanceWarningOpen(true);
                            return;
                          }
                          setBody("remove");
                        }}
                        data-testid="asset-detail-remove-button"
                      >
                        <div className="AssetDetail__options-actions__label">
                          {t("Remove")}
                        </div>
                        <Icon.MinusCircle />
                      </div>
                    </div>
                  ) : null}
                </PopoverContent>
              </Popover>
            )
          }
        />
        <View.Content>
          <div className="AssetDetail__wrapper" data-testid="AssetDetail">
            <div className="AssetDetail__network-icon">
              {assetIconUrl ? (
                <img
                  src={assetIconUrl}
                  alt={t("Network icon")}
                  data-testid="AssetDetail__icon"
                />
              ) : null}
            </div>
            <div className="AssetDetail__title">
              {isLpShare && "liquidityPoolId" in selectedBalance
                ? `LP: ${truncateString(selectedBalance.liquidityPoolId as string, 12)}`
                : title(
                    selectedBalance as Exclude<
                      AssetType,
                      LiquidityPoolShareAsset
                    >,
                  ) || assetDomain}
            </div>
            {"contractId" in selectedBalance ? (
              <div className="AssetDetail__subtitle">
                <CopyValue
                  value={selectedBalance.contractId}
                  displayValue={displaySorobanId(
                    selectedBalance.contractId,
                    28,
                  )}
                />
              </div>
            ) : null}
            <div className="AssetDetail__price">
              {assetPrice && assetPrice.currentPrice
                ? `$${formatAmount(
                    roundUsdValue(
                      new BigNumber(assetPrice.currentPrice).toString(),
                    ),
                  )}`
                : null}
            </div>
            {assetPrice && assetPrice.percentagePriceChange24h ? (
              <div
                className={`AssetDetail__delta ${getPriceDeltaColor(
                  new BigNumber(
                    roundUsdValue(assetPrice.percentagePriceChange24h),
                  ),
                )}`}
              >
                {formatAmount(
                  roundUsdValue(assetPrice.percentagePriceChange24h),
                )}
                %
              </div>
            ) : null}
            <div className="AssetDetail__balance-info">
              <div
                className="AssetDetail__balance"
                data-testid="asset-detail-available-copy"
              >
                <div className="AssetDetail__balance-label">
                  <Icon.Coins01 />
                  {t("Balance")}
                </div>
                <div>{displayTotal}</div>
              </div>
              <div className="AssetDetail__balance-value">
                <div className="AssetDetail__balance-label">
                  <Icon.BankNote02 />
                  {t("Value")}
                </div>
                <div>
                  {assetPrice && assetPrice.currentPrice
                    ? `$${formatAmount(
                        roundUsdValue(
                          new BigNumber(assetPrice.currentPrice)
                            .multipliedBy(selectedBalance.total)
                            .toString(),
                        ),
                      )}`
                    : NO_FIAT_VALUE}
                </div>
              </div>
            </div>
            {filteredAssetOperations === null ? (
              <div
                className="AssetDetail__list AssetDetail__list--loading"
                data-testid="AssetDetail__list__loader"
              >
                <Loader />
              </div>
            ) : (
              <AssetDetailOperations
                filteredAssetOperations={filteredAssetOperations}
                accountBalances={accountBalances}
                publicKey={publicKey}
                networkDetails={networkDetails}
                setActiveAssetId={setActiveAssetId}
              />
            )}
          </div>
        </View.Content>
        {(isShowingSwap || isShowingSend) && (
          <div className="AssetDetail__actions-container">
            {isShowingSend && (
              <Button
                data-testid="asset-detail-send-button"
                variant="secondary"
                size="lg"
                isRounded
                isFullWidth
                onClick={() => {
                  const queryParams = `?asset=${encodeURIComponent(selectedAsset)}&return_to=asset_detail&return_asset=${encodeURIComponent(selectedAsset)}`;
                  navigateTo(ROUTES.sendPayment, navigate, queryParams);
                }}
              >
                {t("Send")}
              </Button>
            )}
            {isShowingSwap && (
              <Button
                data-testid="asset-detail-swap-button"
                variant="secondary"
                size="lg"
                isRounded
                isFullWidth
                onClick={() => {
                  const queryParams = `?source_asset=${encodeURIComponent(selectedAsset)}`;
                  navigateTo(ROUTES.swap, navigate, queryParams);
                }}
              >
                {t("Swap")}
              </Button>
            )}
          </div>
        )}
        {isNative && (
          <SlideupModal
            isModalOpen={isModalOpen}
            setIsModalOpen={setIsModalOpen}
          >
            <div className="AssetDetail__info-modal">
              <div className="AssetDetail__info-modal__total-box">
                <div className="AssetDetail__info-modal__asset-code">
                  <img src={StellarLogo} alt={t("Network icon")} />
                  <div>{` ${canonical.code}`}</div>
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
                      {`${formatAmount(
                        new BigNumber(balanceAvailable)
                          .minus(new BigNumber(selectedBalance?.total))
                          .toString(),
                      )} `}
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
                {`${t(
                  "* All Stellar accounts must maintain a minimum balance of lumens.",
                )} `}
                <a
                  href="https://developers.stellar.org/docs/glossary/minimum-balance/"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("Learn more")}
                </a>
              </div>
            </div>
          </SlideupModal>
        )}
        <SlideupModal
          isModalOpen={body === "remove"}
          setIsModalOpen={() => setBody("detail")}
        >
          {/* Gated on the same flag rather than always mounted:
              ChangeTrustInternal emits signing.rejected on unmount unless it
              was approved, and SlideupModal renders its children even while
              closed -- so an ungated copy would fire a spurious rejection
              every time this sheet closed. Mirrors ManageAssetRows. */}
          <>
            {body === "remove" && shouldChangeTrust && (
              <div className="AssetDetail__remove-sheet">
                <ChangeTrustInternal
                  asset={removeAsset}
                  addTrustline={false}
                  networkDetails={networkDetails}
                  publicKey={publicKey}
                  onCancel={() => setBody("detail")}
                  onSuccess={handleClose}
                  // Fills the fixed-height wrapper above rather than sizing to
                  // its content, so the footer pins and the body scrolls. Also
                  // drops the "you can close this tab" hint, which is only
                  // meaningful in the standalone popup.
                  isFullHeight
                />
              </div>
            )}
            {body === "remove" && !shouldChangeTrust && (
              <ToggleTokenInternal
                asset={{ ...removeAsset, isTrustlineActive: true }}
                networkDetails={networkDetails}
                publicKey={publicKey}
                onCancel={() => setBody("detail")}
                source="asset_detail"
              />
            )}
          </>
        </SlideupModal>

        <InfoBottomSheet
          isOpen={isBalanceWarningOpen}
          icon={<Icon.MinusCircle />}
          badgeVariant="destructive"
          title={t("Token still has a balance")}
          actionLabel={t("Got it")}
          onClose={() => setIsBalanceWarningOpen(false)}
          data-testid="asset-detail-balance-warning"
          closeTestId="asset-detail-balance-warning-close"
        >
          {t(
            "You can't remove this token yet. To remove a token, your balance for this token must be 0. You must send or sell the remaining balance before trying again.",
          )}
        </InfoBottomSheet>
      </View>
    </React.Fragment>
  );
};
