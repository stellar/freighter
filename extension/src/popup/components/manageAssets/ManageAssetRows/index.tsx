import React, { useState, useEffect } from "react";
import { Networks, StellarToml } from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import { ActionStatus, BlockAidScanAssetResult } from "@shared/api/types";

import { AppDispatch } from "popup/App";

import { navigateTo } from "popup/helpers/navigate";
import {
  formatDomain,
  getCanonicalFromAsset,
  truncateString,
} from "helpers/stellar";
import { isContractId } from "popup/helpers/soroban";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";

import { LoadingBackground } from "popup/basics/LoadingBackground";
import { ROUTES } from "popup/constants/routes";
import { hardwareWalletTypeSelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { findAddressBalance } from "popup/helpers/balance";
import {
  resetSubmission,
  transactionSubmissionSelector,
  ShowOverlayStatus,
  tokensSelector,
} from "popup/ducks/transactionSubmission";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import {
  ScamAssetWarning,
  NewAssetWarning,
  TokenWarning,
} from "popup/components/WarningMessages";

import { AccountBalances } from "helpers/hooks/useGetBalances";

import { ManageAssetRowButton } from "../ManageAssetRowButton";

import "./styles.scss";

export type ManageAssetCurrency = StellarToml.Api.Currency & {
  domain: string;
  contract?: string;
  icon?: string;
  isSuspicious?: boolean;
};

export interface NewAssetFlags {
  isInvalidDomain: boolean;
  isRevocable: boolean;
}

interface ManageAssetRowsProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  assetRows: ManageAssetCurrency[];
  isVerifiedToken?: boolean;
  isVerificationInfoShowing?: boolean;
  verifiedLists?: string[];
  balances: AccountBalances;
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
  assetRows,
  isVerifiedToken,
  isVerificationInfoShowing,
  verifiedLists,
  balances,
}: ManageAssetRowsProps) => {
  const {
    submitStatus,
    hardwareWalletData: { status: hwStatus },
  } = useSelector(transactionSubmissionSelector);
  const [assetSubmitting, setAssetSubmitting] = useState("");
  const dispatch: AppDispatch = useDispatch();
  const { accountBalanceStatus } = useSelector(tokensSelector);
  const walletType = useSelector(hardwareWalletTypeSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { recommendedFee } = useNetworkFees();

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
      navigateTo(ROUTES.account);
    }
  }, [submitStatus, dispatch]);

  return (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && walletType && (
        <HardwareSign walletType={walletType} />
      )}
      {showBlockedDomainWarning && (
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
        />
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
          {assetRows.map(
            ({
              code = "",
              domain,
              image = "",
              issuer = "",
              name = "",
              contract = "",
              isSuspicious,
            }) => {
              if (!balances) {
                return null;
              }
              const isContract = isContractId(contract);
              const canonicalAsset = getCanonicalFromAsset(code, issuer);
              const isTrustlineActive = findAddressBalance(
                balances.balances,
                issuer,
                networkDetails.networkPassphrase as Networks,
              );
              const isActionPending =
                submitStatus === ActionStatus.PENDING ||
                accountBalanceStatus === ActionStatus.PENDING;
              return (
                <div
                  className="ManageAssetRows__row"
                  key={canonicalAsset}
                  data-testid="ManageAssetRow"
                >
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
                </div>
              );
            },
          )}
        </div>
        {children}
      </div>
      {showNewAssetWarning || showBlockedDomainWarning
        ? createPortal(
            <LoadingBackground
              // eslint-disable-next-line @typescript-eslint/no-empty-function
              onClick={() => {}}
              isActive
              isFullScreen
            />,
            document.querySelector("#modal-root")!,
          )
        : null}
    </>
  );
};

export interface AssetRowData {
  code?: string;
  issuer?: string;
  image?: string;
  domain: string;
  name?: string;
  isSuspicious?: boolean;
}

export const ManageAssetRow = ({
  code = "",
  issuer = "",
  image = "",
  domain,
  name,
  isSuspicious = false,
}: AssetRowData) => {
  const canonicalAsset = getCanonicalFromAsset(code, issuer);
  const assetCode = name || code;
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
          {formatDomain(domain)}
        </div>
      </div>
    </>
  );
};
