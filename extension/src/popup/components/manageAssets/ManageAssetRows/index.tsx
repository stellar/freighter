import React, { useState, useEffect } from "react";
import { StellarToml, Networks } from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button } from "@stellar/design-system";
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

import { LoadingBackground } from "popup/basics/LoadingBackground";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
  addTokenId,
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
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import {
  ScamAssetWarning,
  NewAssetWarning,
  TokenWarning,
} from "popup/components/WarningMessages";
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";

import "./styles.scss";
import { NETWORKS } from "@shared/constants/stellar";
import { getManageAssetXDR } from "popup/helpers/getManageAssetXDR";
import { checkForSuspiciousAsset } from "popup/helpers/checkForSuspiciousAsset";
import { isContractId } from "popup/helpers/soroban";
import IconAdd from "popup/assets/icon-add.svg";
import IconRemove from "popup/assets/icon-remove.svg";

export type ManageAssetCurrency = StellarToml.Api.Currency & {
  domain: string;
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
  chooseAsset?: boolean;
  isVerifiedToken?: boolean;
  isVerificationInfoShowing?: boolean;
  verifiedLists?: string[];
}

interface SuspiciousAssetData {
  domain: string;
  code: string;
  issuer: string;
  image: string;
  isVerifiedToken?: boolean;
}

export const ManageAssetRows = ({
  children,
  header,
  assetRows,
  chooseAsset,
  isVerifiedToken,
  isVerificationInfoShowing,
  verifiedLists,
}: ManageAssetRowsProps) => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const {
    accountBalances,
    submitStatus,
    hardwareWalletData: { status: hwStatus },
    blockedDomains,
  } = useSelector(transactionSubmissionSelector);
  const [assetSubmitting, setAssetSubmitting] = useState("");
  const dispatch: AppDispatch = useDispatch();
  const { recommendedFee } = useNetworkFees();
  const { accountBalanceStatus } = useSelector(tokensSelector);
  const walletType = useSelector(hardwareWalletTypeSelector);
  const isHardwareWallet = !!walletType;

  const [showBlockedDomainWarning, setShowBlockedDomainWarning] =
    useState(false);
  const [showNewAssetWarning, setShowNewAssetWarning] = useState(false);
  const [showUnverifiedWarning, setShowUnverifiedWarning] = useState(false);
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
    isVerifiedToken: false,
  } as SuspiciousAssetData);

  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );

  const changeTrustline = async (
    assetCode: string,
    assetIssuer: string,
    addTrustline: boolean,
  ) => {
    const canonicalAsset = getCanonicalFromAsset(assetCode, assetIssuer);
    setAssetSubmitting(canonicalAsset);

    const transactionXDR: string = await getManageAssetXDR({
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
      // eslint-disable-next-line
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
          publicKey,
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
    assetRowData = {
      code: "",
      issuer: "",
      domain: "",
      image: "",
    },
    isTrustlineActive: boolean,
    canonicalAsset?: string,
  ) => {
    const contractId = assetRowData.issuer;
    setAssetSubmitting(canonicalAsset || contractId);
    if (!isTrustlineActive) {
      if (isVerificationInfoShowing) {
        setSuspiciousAssetData({
          domain: assetRowData.domain,
          code: assetRowData.code,
          issuer: assetRowData.issuer,
          image: assetRowData.image,
          isVerifiedToken: !!isVerifiedToken,
        });
        setShowUnverifiedWarning(true);
      } else {
        await dispatch(
          addTokenId({
            publicKey,
            tokenId: contractId,
            network: networkDetails.network as Networks,
          }),
        );
        navigateTo(ROUTES.account);
      }
    } else {
      await dispatch(
        removeTokenId({
          contractId,
          network: networkDetails.network as NETWORKS,
        }),
      );
      navigateTo(ROUTES.account);
    }
  };

  return (
    <>
      {hwStatus === ShowOverlayStatus.IN_PROGRESS && walletType && (
        <HardwareSign walletType={walletType} />
      )}
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
      {showUnverifiedWarning && (
        <TokenWarning
          domain={suspiciousAssetData.domain}
          code={suspiciousAssetData.code}
          issuer={suspiciousAssetData.issuer}
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
            ({ code = "", domain, image = "", issuer = "", name = "" }) => {
              if (!accountBalances.balances) {
                return null;
              }
              const isContract = isContractId(issuer);
              const canonicalAsset = getCanonicalFromAsset(code, issuer);
              const isTrustlineActive =
                Object.keys(accountBalances.balances).some(
                  (balance) => balance === canonicalAsset,
                ) || accountBalances.tokensWithNoBalance.includes(issuer);
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
                  />
                  <div className="ManageAssetRows__button">
                    <Button
                      size="md"
                      variant="secondary"
                      disabled={isActionPending}
                      isLoading={
                        isActionPending && assetSubmitting === canonicalAsset
                      }
                      onClick={() => {
                        if (isContract) {
                          handleTokenRowClick(
                            { code, issuer, image, domain },
                            isTrustlineActive,
                            canonicalAsset,
                          );
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
                      {isTrustlineActive ? (
                        <>
                          <div className="ManageAssetRows__button__label">
                            {t("Remove")}
                          </div>
                          <img src={IconRemove} alt="icon remove" />
                        </>
                      ) : (
                        <>
                          <div className="ManageAssetRows__button__label">
                            {t("Add")}
                          </div>
                          <img src={IconAdd} alt="icon add" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            },
          )}

          {chooseAsset &&
            accountBalances.tokensWithNoBalance.map((contract) => {
              const isActionPending =
                accountBalanceStatus === ActionStatus.PENDING;

              return (
                <div className="ManageAssetRows__row" key={contract}>
                  <ManageAssetRow domain={truncateString(contract)} />
                  <div className="ManageAssetRows__button">
                    <Button
                      size="md"
                      variant="secondary"
                      disabled={isActionPending}
                      isLoading={
                        isActionPending && assetSubmitting === contract
                      }
                      onClick={() =>
                        handleTokenRowClick(
                          { code: "", issuer: contract, image: "", domain: "" },
                          true,
                        )
                      }
                      type="button"
                    >
                      <div className="ManageAssetRows__button__label">
                        {t("Remove")}
                      </div>
                      <img src={IconRemove} alt="icon remove" />
                    </Button>
                  </div>
                </div>
              );
            })}
        </div>
        {children}
      </div>
      <LoadingBackground
        // eslint-disable-next-line @typescript-eslint/no-empty-function
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
  name?: string;
}

export const ManageAssetRow = ({
  code = "",
  issuer = "",
  image = "",
  domain,
  name,
}: AssetRowData) => {
  const { blockedDomains } = useSelector(transactionSubmissionSelector);
  const canonicalAsset = getCanonicalFromAsset(code, issuer);
  const isScamAsset = !!blockedDomains.domains[domain];
  const assetCode = name || code;
  const truncatedAssetCode =
    assetCode.length > 20 ? truncateString(assetCode) : assetCode;

  return (
    <>
      <AssetIcon
        assetIcons={code !== "XLM" ? { [canonicalAsset]: image } : {}}
        code={code}
        issuerKey={issuer}
      />
      <div className="ManageAssetRows__row__info">
        <div className="ManageAssetRows__row__info__header">
          <span data-testid="ManageAssetCode">{truncatedAssetCode}</span>
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
