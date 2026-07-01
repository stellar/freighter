import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";

import { getCanonicalFromAsset } from "helpers/stellar";
import { isContractId, isAssetSac } from "popup/helpers/soroban";
import { findAssetBalance } from "popup/helpers/balance";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { Icon } from "@stellar/design-system";
import {
  VerifiedTokenInfoSheet,
  UnverifiedTokenInfoSheet,
} from "popup/components/TokenVerificationSheets";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { SlideupModal } from "popup/components/SlideupModal";
import { publicKeySelector } from "popup/ducks/accountServices";
import { AssetListRow } from "popup/components/AssetListRow";
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
  isMalicious?: boolean;
  decimals?: number;
  balance?: string;
  name?: string;
  image?: string | null;
  /** USD spot price from the stellar.expert search response, if present. */
  price?: number;
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
              isMalicious,
              isSac,
              isTrustlineActive,
              name,
            }) => (
              <AssetListRow
                code={code}
                issuer={issuer}
                iconUrl={image}
                domain={domain}
                isSuspicious={isSuspicious}
                isMalicious={isMalicious}
                // SAC contract tokens display their name; everything else the code.
                displayCode={name && contract && !isSac ? name : code}
                codeTestId="ManageAssetCode"
                domainTestId="ManageAssetDomain"
                rightElement={
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
                }
              />
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
    isMalicious,
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
    isMalicious?: boolean;
    isSac: boolean;
  }) => React.ReactNode;
}) => {
  const { t } = useTranslation();
  const [verifiedSheetOpen, setVerifiedSheetOpen] = useState(false);
  const [unverifiedSheetOpen, setUnverifiedSheetOpen] = useState(false);
  if (shouldSplitAssetsByVerificationStatus) {
    return (
      <>
        {verifiedAssetRows.length > 0 && (
          <button
            type="button"
            className="ManageAssetRows__list-header"
            data-testid="asset-on-list"
            aria-label={t("About verified tokens")}
            onClick={() => setVerifiedSheetOpen(true)}
          >
            <span>{t("Verified")}</span>
            <Icon.InfoCircle />
          </button>
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
            isMalicious,
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
                  isMalicious,
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
          <button
            type="button"
            className="ManageAssetRows__list-header"
            data-testid="not-asset-on-list"
            aria-label={t("About unverified tokens")}
            onClick={() => setUnverifiedSheetOpen(true)}
          >
            <span>{t("Unverified")}</span>
            <Icon.InfoCircle />
          </button>
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
            isMalicious,
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
                  isMalicious,
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
        <VerifiedTokenInfoSheet
          isOpen={verifiedSheetOpen}
          onClose={() => setVerifiedSheetOpen(false)}
        />
        <UnverifiedTokenInfoSheet
          isOpen={unverifiedSheetOpen}
          onClose={() => setUnverifiedSheetOpen(false)}
        />
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
