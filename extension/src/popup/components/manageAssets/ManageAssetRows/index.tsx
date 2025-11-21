import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import {
  formatDomain,
  getCanonicalFromAsset,
  truncateString,
} from "helpers/stellar";
import { isContractId, isAssetSac } from "popup/helpers/soroban";
import { findAssetBalance } from "popup/helpers/balance";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { InfoTooltip } from "popup/basics/InfoTooltip";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { SlideupModal } from "popup/components/SlideupModal";
import { publicKeySelector } from "popup/ducks/accountServices";
import { ChangeTrustInternal } from "./ChangeTrustInternal";
import { ManageAssetRowButton } from "../ManageAssetRowButton";
import { ToggleTokenInternal } from "./ToggleTokenInternal";
import { NetworkDetails } from "@shared/constants/stellar";
import { getNativeContractDetails } from "popup/helpers/searchAsset";

import "./styles.scss";

export type ManageAssetCurrency = {
  code?: string;
  issuer?: string;
  domain: string | null;
  contract?: string;
  icon?: string;
  isSuspicious?: boolean;
  decimals?: number;
  balance?: string;
  name?: string;
  image?: string | null;
};

export interface NewAssetFlags {
  isInvalidDomain: boolean;
  isRevocable: boolean;
}

interface ManageAssetRowsProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  verifiedAssetRows: ManageAssetCurrency[];
  unverifiedAssetRows: ManageAssetCurrency[];
  isVerifiedToken?: boolean;
  isVerificationInfoShowing?: boolean;
  verifiedLists?: string[];
  balances: AccountBalances;
  shouldSplitAssetsByVerificationStatus?: boolean;
}

export const ManageAssetRows = ({
  children,
  header,
  verifiedAssetRows,
  unverifiedAssetRows,
  balances,
  shouldSplitAssetsByVerificationStatus = true,
}: ManageAssetRowsProps) => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);

  const [selectedAsset, setSelectedAsset] = useState<
    | {
        code: string;
        issuer: string;
        domain: string | null;
        image: string | null;
        isTrustlineActive: boolean;
        contract?: string;
        name?: string;
      }
    | undefined
  >(undefined);

  const shouldChangeTrust = useMemo(() => {
    if (selectedAsset && selectedAsset.contract) {
      return isAssetSac({
        asset: {
          code: selectedAsset.code,
          issuer: selectedAsset.issuer,
          contract: selectedAsset.contract,
        },
        networkDetails,
      });
    }
    return true;
  }, [selectedAsset, networkDetails]);

  return (
    <>
      <div className="ManageAssetRows__scrollbar">
        {header}
        <div className="ManageAssetRows__content">
          <AssetRows
            accountBalances={balances}
            verifiedAssetRows={verifiedAssetRows}
            unverifiedAssetRows={unverifiedAssetRows}
            networkDetails={networkDetails}
            shouldSplitAssetsByVerificationStatus={
              shouldSplitAssetsByVerificationStatus
            }
            renderAssetRow={({
              code,
              contract,
              domain,
              image,
              issuer,
              isSuspicious,
              isSac,
              isTrustlineActive,
              name,
            }) => (
              <>
                <ManageAssetRow
                  code={code}
                  issuer={issuer}
                  image={image}
                  domain={domain}
                  name={name}
                  isSuspicious={isSuspicious}
                />
                <ManageAssetRowButton
                  code={code}
                  issuer={issuer}
                  isTrustlineActive={!!isTrustlineActive}
                  isSac={isSac}
                  isLoading={false}
                  onClick={async () => {
                    setSelectedAsset({
                      code,
                      issuer,
                      domain,
                      name,
                      image,
                      isTrustlineActive,
                      contract,
                    });
                  }}
                />
              </>
            )}
          />
        </div>
        {children}
        {createPortal(
          <SlideupModal
            setIsModalOpen={() => setSelectedAsset(undefined)}
            isModalOpen={selectedAsset !== undefined}
          >
            <>
              {selectedAsset && shouldChangeTrust && (
                <ChangeTrustInternal
                  asset={selectedAsset}
                  addTrustline={!selectedAsset.isTrustlineActive}
                  networkDetails={networkDetails}
                  publicKey={publicKey}
                  onCancel={() => setSelectedAsset(undefined)}
                />
              )}
              {selectedAsset && !shouldChangeTrust && (
                <ToggleTokenInternal
                  asset={selectedAsset || ""}
                  networkDetails={networkDetails}
                  publicKey={publicKey}
                  onCancel={() => setSelectedAsset(undefined)}
                />
              )}
            </>
          </SlideupModal>,
          document.getElementById("layout-view")!,
        )}
      </div>
    </>
  );
};

export interface AssetRowData {
  code?: string;
  domain: string | null;
  image?: string | null;
  issuer?: string;
  isSuspicious?: boolean;
  name?: string;
  contractId?: string;
}

const AssetRows = ({
  accountBalances,
  renderAssetRow,
  shouldSplitAssetsByVerificationStatus,
  unverifiedAssetRows,
  verifiedAssetRows,
  networkDetails,
}: {
  accountBalances: AccountBalances;
  shouldSplitAssetsByVerificationStatus?: boolean;
  unverifiedAssetRows: ManageAssetCurrency[];
  verifiedAssetRows: ManageAssetCurrency[];
  networkDetails: NetworkDetails;
  renderAssetRow: ({
    code,
    domain,
    image,
    issuer,
    name,
    contract,
    isContract,
    isTrustlineActive,
    isSuspicious,
    isSac,
  }: {
    code: string;
    domain: string | null;
    image: string | null;
    issuer: string;
    name: string;
    contract: string;
    isContract: boolean;
    isTrustlineActive: boolean;
    isSuspicious?: boolean;
    isSac: boolean;
  }) => React.ReactNode;
}) => {
  const { t } = useTranslation();
  if (shouldSplitAssetsByVerificationStatus) {
    return (
      <>
        {verifiedAssetRows.length > 0 && (
          <InfoTooltip
            infoText={
              <span>
                {t(
                  "Freighter uses asset lists to verify assets before interactions.",
                )}
                {t("You can define your own assets lists in Settings.")}
              </span>
            }
            placement="bottom-start"
          >
            <h5
              className="ManageAssetRows__tooltip"
              data-testid="asset-on-list"
            >
              On your lists
            </h5>
          </InfoTooltip>
        )}
        {verifiedAssetRows.map(
          ({
            code = "",
            domain,
            image = "",
            issuer = "",
            name = "",
            contract = "",
            isSuspicious,
          }) => {
            if (!accountBalances.balances) {
              return null;
            }
            const nativeContract = getNativeContractDetails(networkDetails);
            const isContract = isContractId(contract);
            const canonicalAsset = getCanonicalFromAsset(code, issuer);
            const isTrustlineActive = findAssetBalance(
              accountBalances.balances,
              { code, issuer },
            );
            const isSac = isAssetSac({
              asset: {
                code,
                issuer,
                contract,
              },
              networkDetails,
            });
            return (
              <div
                className="ManageAssetRows__row"
                key={canonicalAsset}
                data-testid="ManageAssetRow"
              >
                {renderAssetRow({
                  code,
                  contract,
                  domain,
                  image,
                  isContract,
                  issuer,
                  isSuspicious,
                  isSac,
                  isTrustlineActive:
                    isTrustlineActive !== undefined ||
                    contract === nativeContract.contract,
                  name,
                })}
              </div>
            );
          },
        )}
        {unverifiedAssetRows.length > 0 && (
          <InfoTooltip
            infoText={
              <span>
                {t(
                  "These assets are not on any of your lists. Proceed with caution before adding.",
                )}
              </span>
            }
            placement="bottom-start"
          >
            <h5
              className="ManageAssetRows__tooltip"
              data-testid="not-asset-on-list"
            >
              Not on your lists
            </h5>
          </InfoTooltip>
        )}
        {unverifiedAssetRows.map(
          ({
            code = "",
            domain,
            image = "",
            issuer = "",
            name = "",
            contract = "",
            isSuspicious,
          }) => {
            if (!accountBalances.balances) {
              return null;
            }
            const nativeContract = getNativeContractDetails(networkDetails);
            const isContract = isContractId(contract);
            const canonicalAsset = getCanonicalFromAsset(code, issuer);
            const isTrustlineActive = findAssetBalance(
              accountBalances.balances,
              { code, issuer },
            );
            const isSac = isAssetSac({
              asset: {
                code,
                issuer,
                contract,
              },
              networkDetails,
            });

            return (
              <div
                className="ManageAssetRows__row"
                key={canonicalAsset}
                data-testid="ManageAssetRow"
              >
                {renderAssetRow({
                  code,
                  contract,
                  domain,
                  image,
                  isContract,
                  issuer,
                  isSuspicious,
                  isSac,
                  isTrustlineActive:
                    isTrustlineActive !== undefined ||
                    contract === nativeContract.contract,
                  name,
                })}
              </div>
            );
          },
        )}
      </>
    );
  }
  const combinedAssets = [...verifiedAssetRows, ...unverifiedAssetRows];
  return (
    <>
      {combinedAssets.map(
        ({
          code = "",
          domain,
          image = "",
          issuer = "",
          name = "",
          contract = "",
          isSuspicious,
        }) => {
          if (!accountBalances.balances) {
            return null;
          }
          const nativeContract = getNativeContractDetails(networkDetails);
          const isContract = isContractId(contract);
          const canonicalAsset = getCanonicalFromAsset(code, issuer);
          const isTrustlineActive = findAssetBalance(accountBalances.balances, {
            code,
            issuer,
          });
          const isSac = isAssetSac({
            asset: {
              code,
              issuer,
              contract,
            },
            networkDetails,
          });
          return (
            <div
              className="ManageAssetRows__row"
              key={canonicalAsset}
              data-testid="ManageAssetRow"
            >
              {renderAssetRow({
                code,
                contract,
                domain,
                image,
                isContract,
                issuer,
                isSuspicious,
                isSac,
                isTrustlineActive:
                  isTrustlineActive !== undefined ||
                  contract === nativeContract.contract,
                name,
              })}
            </div>
          );
        },
      )}
    </>
  );
};

export const ManageAssetRow = ({
  code = "",
  issuer = "",
  image = "",
  domain,
  name,
  isSuspicious = false,
  contractId,
}: AssetRowData) => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const canonicalAsset = getCanonicalFromAsset(code, issuer);
  // use the name unless the name is SAC, format "code:issuer"
  const assetCode =
    name &&
    contractId &&
    !isAssetSac({
      asset: {
        code,
        issuer,
        contract: contractId,
      },
      networkDetails,
    })
      ? name
      : code;
  const truncatedAssetCode =
    assetCode.length > 20 ? truncateString(assetCode) : assetCode;

  return (
    <>
      <AssetIcon
        assetIcons={code !== "XLM" ? { [canonicalAsset]: image } : {}}
        code={code}
        issuerKey={issuer}
        isSuspicious={isSuspicious}
      />
      <div className="ManageAssetRows__row__info">
        <div className="ManageAssetRows__row__info__header">
          <span data-testid="ManageAssetCode">{truncatedAssetCode}</span>
        </div>
        <div
          className="ManageAssetRows__domain"
          data-testid="ManageAssetDomain"
        >
          {formatDomain(domain || "") === "Stellar Network"
            ? t("Stellar Network")
            : formatDomain(domain || "")}
        </div>
      </div>
    </>
  );
};
