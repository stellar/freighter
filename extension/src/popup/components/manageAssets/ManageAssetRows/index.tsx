import React, { useContext, useState, useEffect } from "react";
import {
  Account,
  Asset,
  Operation,
  StellarTomlResolver,
  TransactionBuilder,
  Networks,
} from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { ActionStatus } from "@shared/api/types";

import { AppDispatch } from "popup/App";

import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

import { emitMetric } from "helpers/metrics";
import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { getApiStellarExpertUrl } from "popup/helpers/account";
import {
  formatDomain,
  getCanonicalFromAsset,
  xlmToStroop,
  truncateString,
} from "helpers/stellar";

import { SimpleBarWrapper } from "popup/basics/SimpleBarWrapper";
import { PillButton } from "popup/basics/buttons/PillButton";
import { LoadingBackground } from "popup/basics/LoadingBackground";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { removeTokenId, sorobanSelector } from "popup/ducks/soroban";
import {
  getAccountBalances,
  resetSubmission,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
  startHwSign,
  ShowOverlayStatus,
} from "popup/ducks/transactionSubmission";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { LedgerSign } from "popup/components/hardwareConnect/LedgerSign";
import {
  ScamAssetWarning,
  NewAssetWarning,
} from "popup/components/WarningMessages";
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";
import { SorobanContext } from "popup/SorobanContext";

import "./styles.scss";

export type ManageAssetCurrency = StellarTomlResolver.Currency & {
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
  maxHeight: number;
}

export const ManageAssetRows = ({
  children,
  header,
  assetRows,
  maxHeight,
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
  const { getTokenBalancesStatus, tokensWithNoBalance } = useSelector(
    sorobanSelector,
  );
  const sorobanClient = useContext(SorobanContext);

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
    const changeParams = addTrustline ? {} : { limit: "0" };
    const sourceAccount: Account = await server.loadAccount(publicKey);
    const canonicalAsset = getCanonicalFromAsset(assetCode, assetIssuer);

    setAssetSubmitting(canonicalAsset);

    const transactionXDR = new TransactionBuilder(sourceAccount, {
      fee: xlmToStroop(recommendedFee).toFixed(),
      networkPassphrase: networkDetails.networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset: new Asset(assetCode, assetIssuer),
          ...changeParams,
        }),
      )
      .setTimeout(180)
      .build()
      .toXDR();

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

  // watch submitStatus if used ledger to send transaction
  useEffect(() => {
    if (submitStatus === ActionStatus.ERROR) {
      navigateTo(ROUTES.trustlineError);
    } else if (submitStatus === ActionStatus.SUCCESS) {
      dispatch(resetSubmission());
      navigateTo(ROUTES.account);
    }
  }, [submitStatus, assetSubmitting, dispatch]);

  const isBlockedDomain = (domain: string) => blockedDomains.domains[domain];

  const checkForSuspiciousAsset = async (
    code: string,
    issuer: string,
    domain: string,
  ): Promise<NewAssetFlags> => {
    // check revocable
    let isRevocable = false;
    try {
      const resp = await server.assets().forCode(code).forIssuer(issuer).call();
      isRevocable = resp.records[0]
        ? resp.records[0]?.flags?.auth_revocable
        : false;
    } catch (e) {
      console.error(e);
    }

    // check if new asset
    let isNewAsset = false;
    try {
      const resp = await fetch(
        `${getApiStellarExpertUrl(
          networkDetails,
        )}/asset/${code}-${issuer}/rating`,
      );
      const json = await resp.json();
      const age = json.rating?.age;
      if (!age || age <= 3) {
        isNewAsset = true;
      }
    } catch (e) {
      console.error(e);
    }

    // check domain
    let isInvalidDomain = false;
    try {
      const resp = await StellarTomlResolver.resolve(domain);
      let found = false;
      (resp?.CURRENCIES || []).forEach(
        (c: { code?: string; issuer?: string }) => {
          if (c.code === code && c.issuer === issuer) {
            found = true;
          }
        },
      );
      isInvalidDomain = !found;
    } catch (e) {
      console.error(e);
      isInvalidDomain = true;
    }

    return { isRevocable, isNewAsset, isInvalidDomain };
  };

  const handleRowClick = async (
    assetRowData = {
      code: "",
      issuer: "",
      domain: "",
      image: "",
    },
    isTrustlineActive: boolean,
  ) => {
    const resp = await checkForSuspiciousAsset(
      assetRowData.code,
      assetRowData.issuer,
      assetRowData.domain,
    );

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
        network: networkDetails.network as Networks,
        sorobanClient,
      }),
    );
    setAssetSubmitting("");
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
      <SimpleBarWrapper
        className="ManageAssetRows__scrollbar"
        style={{
          maxHeight: `${maxHeight}px`,
        }}
      >
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
                getTokenBalancesStatus === ActionStatus.PENDING;

              return (
                <div className="ManageAssetRows__row" key={canonicalAsset}>
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
              getTokenBalancesStatus === ActionStatus.PENDING;

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
      </SimpleBarWrapper>
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
          {code}
          <ScamAssetIcon isScamAsset={isScamAsset} />
        </div>
        <div className="ManageAssetRows__domain">{formatDomain(domain)}</div>
      </div>
    </>
  );
};
