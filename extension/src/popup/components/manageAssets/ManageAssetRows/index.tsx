import React, { useState, useEffect } from "react";
import { Networks, StellarToml } from "stellar-sdk";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ActionStatus, BlockAidScanAssetResult } from "@shared/api/types";

import { AppDispatch } from "popup/App";

import { navigateTo } from "popup/helpers/navigate";
import {
  formatDomain,
  getCanonicalFromAsset,
  truncateString,
} from "helpers/stellar";
import { isContractId, isSacContract } from "popup/helpers/soroban";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";

import { LoadingBackground } from "popup/basics/LoadingBackground";
import { ROUTES } from "popup/constants/routes";
import { hardwareWalletTypeSelector } from "popup/ducks/accountServices";
import { findAssetBalance } from "popup/helpers/balance";
import {
  resetSubmission,
  transactionSubmissionSelector,
  ShowOverlayStatus,
  tokensSelector,
} from "popup/ducks/transactionSubmission";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import {
  ScamAssetWarning,
  NewAssetWarning,
  TokenWarning,
} from "popup/components/WarningMessages";
import { InfoTooltip } from "popup/basics/InfoTooltip";

import { AccountBalances } from "helpers/hooks/useGetBalances";

import { ManageAssetRowButton } from "../ManageAssetRowButton";

import "./styles.scss";

export type ManageAssetCurrency = StellarToml.Api.Currency & {
  domain: string;
  contract?: string;
  icon?: string;
  isSuspicious?: boolean;
  decimals?: number;
  balance?: string;
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

interface SuspiciousAssetData {
  domain: string;
  code: string;
  issuer: string;
  image: string;
  isVerifiedToken?: boolean;
  blockaidData: BlockAidScanAssetResult;
}

export const ManageAssetRows = ({
  children,
  header,
  verifiedAssetRows,
  unverifiedAssetRows,
  isVerifiedToken,
  isVerificationInfoShowing,
  verifiedLists,
  balances,
  shouldSplitAssetsByVerificationStatus = true,
}: ManageAssetRowsProps) => {
  const {
    submitStatus,
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);
  const [assetSubmitting, setAssetSubmitting] = useState("");
  const dispatch = useDispatch<AppDispatch>();
  const { accountBalanceStatus } = useSelector(tokensSelector);
  const walletType = useSelector(hardwareWalletTypeSelector);
  const { recommendedFee } = useNetworkFees();
  const navigate = useNavigate();

  const [showBlockedDomainWarning, setShowBlockedDomainWarning] =
    useState(false);
  const [showNewAssetWarning, setShowNewAssetWarning] = useState(false);
  const [showUnverifiedWarning, setShowUnverifiedWarning] = useState(false);
  const [newAssetFlags, setNewAssetFlags] = useState<NewAssetFlags>({
    isInvalidDomain: false,
    isRevocable: false,
  });
  const [suspiciousAssetData, setSuspiciousAssetData] = useState({
    domain: "",
    code: "",
    issuer: "",
    image: "",
    isVerifiedToken: false,
    blockaidData: defaultBlockaidScanAssetResult,
  } as SuspiciousAssetData);
  const [handleAddToken, setHandleAddToken] = useState(
    null as null | (() => () => Promise<void>),
  );

  useEffect(
    () => () => {
      setAssetSubmitting("");
    },
    [],
  );

  // watch submitStatus if used ledger to send transaction
  useEffect(() => {
    if (submitStatus === ActionStatus.SUCCESS) {
      dispatch(resetSubmission());
      navigateTo(ROUTES.account, navigate);
    }
  }, [submitStatus, dispatch, navigate]);

  const isActionPending =
    submitStatus === ActionStatus.PENDING ||
    accountBalanceStatus === ActionStatus.PENDING;

  return (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && walletType && (
        <HardwareSign walletType={walletType} />
      )}
      {showBlockedDomainWarning &&
        createPortal(
          <ScamAssetWarning
            pillType="Trustline"
            balances={balances}
            domain={suspiciousAssetData.domain}
            assetIcons={balances.icons || {}}
            code={suspiciousAssetData.code}
            issuer={suspiciousAssetData.issuer}
            image={suspiciousAssetData.image}
            blockaidData={suspiciousAssetData.blockaidData}
            onClose={() => {
              setShowBlockedDomainWarning(false);
            }}
          />,
          document.querySelector("#modal-root")!,
        )}
      {showNewAssetWarning && (
        <NewAssetWarning
          balances={balances}
          domain={suspiciousAssetData.domain}
          code={suspiciousAssetData.code}
          issuer={suspiciousAssetData.issuer}
          image={suspiciousAssetData.image}
          newAssetFlags={newAssetFlags}
          onClose={() => {
            setShowNewAssetWarning(false);
          }}
        />
      )}
      {showUnverifiedWarning && (
        <TokenWarning
          isCustomToken={isContractId(suspiciousAssetData.issuer)}
          handleAddToken={handleAddToken}
          domain={suspiciousAssetData.domain}
          code={suspiciousAssetData.code}
          onClose={() => {
            setShowUnverifiedWarning(false);
          }}
          isVerifiedToken={!!suspiciousAssetData.isVerifiedToken}
          verifiedLists={verifiedLists}
        />
      )}
      <div className="ManageAssetRows__scrollbar">
        {header}
        <div className="ManageAssetRows__content">
          <AssetRows
            accountBalances={balances}
            verifiedAssetRows={verifiedAssetRows}
            unverifiedAssetRows={unverifiedAssetRows}
            shouldSplitAssetsByVerificationStatus={
              shouldSplitAssetsByVerificationStatus
            }
            renderAssetRow={({
              code,
              contract,
              domain,
              image,
              isContract,
              issuer,
              isSuspicious,
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
                  contract={contract}
                  issuer={issuer}
                  image={image}
                  balances={balances}
                  domain={domain}
                  isTrustlineActive={!!isTrustlineActive}
                  isActionPending={isActionPending}
                  isContract={isContract}
                  isVerifiedToken={!!isVerifiedToken}
                  isVerificationInfoShowing={!!isVerificationInfoShowing}
                  setNewAssetFlags={setNewAssetFlags}
                  setSuspiciousAssetData={setSuspiciousAssetData}
                  setHandleAddToken={setHandleAddToken}
                  setShowBlockedDomainWarning={setShowBlockedDomainWarning}
                  assetSubmitting={assetSubmitting}
                  setAssetSubmitting={setAssetSubmitting}
                  setShowNewAssetWarning={setShowNewAssetWarning}
                  setShowUnverifiedWarning={setShowUnverifiedWarning}
                  recommendedFee={recommendedFee}
                />
              </>
            )}
          />
        </div>
        {children}
      </div>
      {showNewAssetWarning || showBlockedDomainWarning
        ? createPortal(
            <LoadingBackground onClick={() => {}} isActive isFullScreen />,
            document.querySelector("#modal-root")!,
          )
        : null}
    </>
  );
};

export interface AssetRowData {
  code?: string;
  domain: string;
  image?: string;
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
}: {
  accountBalances: AccountBalances;
  shouldSplitAssetsByVerificationStatus?: boolean;
  unverifiedAssetRows: ManageAssetCurrency[];
  verifiedAssetRows: ManageAssetCurrency[];
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
  }: {
    code: string;
    domain: string;
    image: string;
    issuer: string;
    name: string;
    contract: string;
    isContract: boolean;
    isTrustlineActive: boolean;
    isSuspicious?: boolean;
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
            const isContract = isContractId(contract);
            const canonicalAsset = getCanonicalFromAsset(code, issuer);
            const isTrustlineActive = findAssetBalance(
              accountBalances.balances,
              { code, issuer },
            );
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
                  isTrustlineActive: isTrustlineActive !== undefined,
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
            const isContract = isContractId(contract);
            const canonicalAsset = getCanonicalFromAsset(code, issuer);
            const isTrustlineActive = findAssetBalance(
              accountBalances.balances,
              { code, issuer },
            );
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
                  isTrustlineActive: isTrustlineActive !== undefined,
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
          const isContract = isContractId(contract);
          const canonicalAsset = getCanonicalFromAsset(code, issuer);
          const isTrustlineActive = findAssetBalance(accountBalances.balances, {
            code,
            issuer,
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
                isTrustlineActive: isTrustlineActive !== undefined,
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
    !isSacContract(
      name,
      contractId,
      networkDetails.networkPassphrase as Networks,
    )
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
        icon={image}
      />
      <div className="ManageAssetRows__row__info">
        <div className="ManageAssetRows__row__info__header">
          <span data-testid="ManageAssetCode">{truncatedAssetCode}</span>
        </div>
        <div
          className="ManageAssetRows__domain"
          data-testid="ManageAssetDomain"
        >
          {formatDomain(domain)}
        </div>
      </div>
    </>
  );
};
