import React, { useState, useEffect } from "react";
import { StellarToml } from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ActionStatus } from "@shared/api/types";

import { AppDispatch } from "popup/App";

import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

import { emitMetric } from "helpers/metrics";
import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  formatDomain,
  getCanonicalFromAsset,
  truncateString,
} from "helpers/stellar";

import { PillButton } from "popup/basics/buttons/PillButton";
import { LoadingBackground } from "popup/basics/LoadingBackground";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  getAccountBalances,
  resetSubmission,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
  startHwSign,
  ShowOverlayStatus,
  removeTokenId,
  tokensSelector,
} from "popup/ducks/transactionSubmission";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { LedgerSign } from "popup/components/hardwareConnect/LedgerSign";
import {
  ScamAssetWarning,
  NewAssetWarning,
} from "popup/components/WarningMessages";
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";

import "./styles.scss";
import { NETWORKS } from "@shared/constants/stellar";
import { getManageAssetXDR } from "popup/helpers/getManageAssetXDR";
import { checkForSuspiciousAsset } from "popup/helpers/checkForSuspiciousAsset";

export type ManageAssetCurrency = StellarToml.Api.Currency & {
  domain: string;
  contractId?: string;
  name?: string;
};

export interface NewAssetFlags {
  isInvalidDomain: boolean;
  isRevocable: boolean;
  isNewAsset: boolean;
}

interface ManageAssetRowsProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  assetRows: ManageAssetCurrency[];
}

export const ManageAssetRows = ({
  children,
  header,
  assetRows,
}: ManageAssetRowsProps) => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const {
    accountBalances: { balances = {} },
    submitStatus,
    hardwareWalletData: { status: hwStatus },
    blockedDomains,
  } = useSelector(transactionSubmissionSelector);
  const [assetSubmitting, setAssetSubmitting] = useState("");
  const dispatch: AppDispatch = useDispatch();
  const { recommendedFee } = useNetworkFees();
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);
  const { accountBalanceStatus, tokensWithNoBalance } = useSelector(
    tokensSelector,
  );

  const [showBlockedDomainWarning, setShowBlockedDomainWarning] = useState(
    false,
  );
  const [showNewAssetWarning, setShowNewAssetWarning] = useState(false);
  const [newAssetFlags, setNewAssetFlags] = useState<NewAssetFlags>({
    isNewAsset: false,
    isInvalidDomain: false,
    isRevocable: false,
  });
  const [suspiciousAssetData, setSuspiciousAssetData] = useState({
    domain: "",
    code: "",
    issuer: "",
    image: "",
  });

  const server = stellarSdkServer(networkDetails.networkUrl);

  const changeTrustline = async (
    assetCode: string,
    assetIssuer: string,
    addTrustline: boolean,
  ) => {
    const canonicalAsset = getCanonicalFromAsset(assetCode, assetIssuer);
    setAssetSubmitting(canonicalAsset);

    const transactionXDR = await getManageAssetXDR({
      publicKey,
      assetCode,
      assetIssuer,
      addTrustline,
      server,
      recommendedFee,
      networkDetails,
    });

    const trackChangeTrustline = () => {
      emitMetric(
        addTrustline
          ? METRIC_NAMES.manageAssetAddAsset
          : METRIC_NAMES.manageAssetRemoveAsset,
        { assetCode, assetIssuer },
      );
    };

    if (isHardwareWallet) {
      await dispatch(startHwSign({ transactionXDR, shouldSubmit: true }));
      trackChangeTrustline();
    } else {
      await signAndSubmit(transactionXDR, trackChangeTrustline);
    }
  };

  const signAndSubmit = async (
    transactionXDR: string,
    trackChangeTrustline: () => void,
  ) => {
    const res = await dispatch(
      signFreighterTransaction({
        transactionXDR,
        network: networkDetails.networkPassphrase,
      }),
    );

    if (signFreighterTransaction.fulfilled.match(res)) {
      const submitResp = await dispatch(
        submitFreighterTransaction({
          signedXDR: res.payload.signedTransaction,
          networkDetails,
        }),
      );

      if (submitFreighterTransaction.fulfilled.match(submitResp)) {
        setAssetSubmitting("");
        dispatch(
          getAccountBalances({
            publicKey,
            networkDetails,
          }),
        );
        trackChangeTrustline();
        dispatch(resetSubmission());
        navigateTo(ROUTES.account);
      }

      if (submitFreighterTransaction.rejected.match(submitResp)) {
        navigateTo(ROUTES.trustlineError);
      }
    }
  };

  useEffect(
    () => () => {
      setAssetSubmitting("");
    },
    [],
  );

  // watch submitStatus if used ledger to send transaction
  useEffect(() => {
    if (submitStatus === ActionStatus.ERROR) {
      navigateTo(ROUTES.trustlineError);
    } else if (submitStatus === ActionStatus.SUCCESS) {
      dispatch(resetSubmission());
      navigateTo(ROUTES.account);
    }
  }, [submitStatus, dispatch]);

  const isBlockedDomain = (domain: string) => blockedDomains.domains[domain];

  const handleRowClick = async (
    assetRowData = {
      code: "",
      issuer: "",
      domain: "",
      image: "",
    },
    isTrustlineActive: boolean,
  ) => {
    const resp = await checkForSuspiciousAsset({
      code: assetRowData.code,
      issuer: assetRowData.issuer,
      domain: assetRowData.domain,
      server,
      networkDetails,
    });

    if (isBlockedDomain(assetRowData.domain) && !isTrustlineActive) {
      setShowBlockedDomainWarning(true);
      setSuspiciousAssetData(assetRowData);
    } else if (
      !isTrustlineActive &&
      (resp.isInvalidDomain || resp.isRevocable || resp.isNewAsset)
    ) {
      setShowNewAssetWarning(true);
      setNewAssetFlags(resp);
      setSuspiciousAssetData(assetRowData);
    } else {
      changeTrustline(
        assetRowData.code,
        assetRowData.issuer,
        !isTrustlineActive,
      );
    }
  };

  const handleTokenRowClick = async (
    contractId: string,
    canonicalAsset?: string,
  ) => {
    setAssetSubmitting(canonicalAsset || contractId);
    await dispatch(
      removeTokenId({
        contractId,
        network: networkDetails.network as NETWORKS,
      }),
    );
    navigateTo(ROUTES.account);
  };

  return (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && <LedgerSign />}
      {showBlockedDomainWarning && (
        <ScamAssetWarning
          domain={suspiciousAssetData.domain}
          code={suspiciousAssetData.code}
          issuer={suspiciousAssetData.issuer}
          image={suspiciousAssetData.image}
          onClose={() => {
            setShowBlockedDomainWarning(false);
          }}
        />
      )}
      {showNewAssetWarning && (
        <NewAssetWarning
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
      <div className="ManageAssetRows__scrollbar">
        {header}
        <div className="ManageAssetRows__content">
          {assetRows.map(
            ({
              code = "",
              domain,
              image = "",
              issuer = "",
              contractId = "",
            }) => {
              if (!balances) return null;
              const canonicalAsset = getCanonicalFromAsset(code, issuer);
              const isTrustlineActive = Object.keys(balances).some(
                (balance) => balance === canonicalAsset,
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
                    domain={contractId ? truncateString(contractId) : domain}
                  />
                  <div className="ManageAssetRows__button">
                    <PillButton
                      disabled={isActionPending}
                      isLoading={
                        isActionPending && assetSubmitting === canonicalAsset
                      }
                      onClick={() => {
                        if (contractId) {
                          handleTokenRowClick(contractId, canonicalAsset);
                        } else {
                          handleRowClick(
                            { code, issuer, image, domain },
                            isTrustlineActive,
                          );
                        }
                      }}
                      type="button"
                      data-testid="ManageAssetRowButton"
                    >
                      {isTrustlineActive || contractId ? t("Remove") : t("Add")}
                    </PillButton>
                  </div>
                </div>
              );
            },
          )}

          {tokensWithNoBalance.map((tokenId) => {
            const isActionPending =
              accountBalanceStatus === ActionStatus.PENDING;

            return (
              <div className="ManageAssetRows__row" key={tokenId}>
                <ManageAssetRow domain={truncateString(tokenId)} />
                <div className="ManageAssetRows__button">
                  <PillButton
                    disabled={isActionPending}
                    isLoading={isActionPending && assetSubmitting === tokenId}
                    onClick={() => handleTokenRowClick(tokenId)}
                    type="button"
                  >
                    {t("Remove")}
                  </PillButton>
                </div>
              </div>
            );
          })}
        </div>
        {children}
      </div>
      <LoadingBackground
        onClick={() => {}}
        isActive={showNewAssetWarning || showBlockedDomainWarning}
      />
    </>
  );
};

interface AssetRowData {
  code?: string;
  issuer?: string;
  image?: string;
  domain: string;
}

export const ManageAssetRow = ({
  code = "",
  issuer = "",
  image = "",
  domain,
}: AssetRowData) => {
  const { blockedDomains } = useSelector(transactionSubmissionSelector);
  const canonicalAsset = getCanonicalFromAsset(code, issuer);
  const isScamAsset = !!blockedDomains.domains[domain];

  return (
    <>
      <AssetIcon
        assetIcons={code !== "XLM" ? { [canonicalAsset]: image } : {}}
        code={code}
        issuerKey={issuer}
      />
      <div className="ManageAssetRows__row__info">
        <div className="ManageAssetRows__row__info__header">
          <span data-testid="ManageAssetCode">{code}</span>
          <ScamAssetIcon isScamAsset={isScamAsset} />
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
