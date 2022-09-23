import React, { useState, useEffect } from "react";
import StellarSdk, { Account } from "stellar-sdk";
import { useDispatch, useSelector } from "react-redux";
import SimpleBar from "simplebar-react";
import { useTranslation } from "react-i18next";
import "simplebar-react/dist/simplebar.min.css";
import { CURRENCY } from "@shared/api/types";

import { AppDispatch } from "popup/App";

import { emitMetric } from "helpers/metrics";
import { navigateTo } from "popup/helpers/navigate";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  formatDomain,
  getCanonicalFromAsset,
  xlmToStroop,
} from "helpers/stellar";

import { PillButton } from "popup/basics/buttons/PillButton";
import { LoadingBackground } from "popup/basics/LoadingBackground";

import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";
import { useIsScamAsset } from "popup/helpers/useIsScamAsset";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  ActionStatus,
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
import IconWarning from "popup/assets/icon-warning-red.svg";

import "./styles.scss";

export type ManageAssetCurrency = CURRENCY & { domain: string };

export interface NewAssetFlags {
  isInvalidDomain: boolean;
  isRevocable: boolean;
  isNewAsset: boolean;
}

interface ManageAssetRowsProps {
  children?: React.ReactNode;
  header?: React.ReactNode;
  assetRows: ManageAssetCurrency[];
  setErrorAsset: (errorAsset: string) => void;
  maxHeight: number;
}

export const ManageAssetRows = ({
  children,
  header,
  assetRows,
  setErrorAsset,
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

  const server = new StellarSdk.Server(networkDetails.networkUrl);

  const changeTrustline = async (
    assetCode: string,
    assetIssuer: string,
    addTrustline: boolean,
  ) => {
    const changeParams = addTrustline ? {} : { limit: "0" };
    const sourceAccount: Account = await server.loadAccount(publicKey);
    const canonicalAsset = getCanonicalFromAsset(assetCode, assetIssuer);

    setAssetSubmitting(canonicalAsset);

    const transactionXDR = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: xlmToStroop(recommendedFee).toFixed(),
      networkPassphrase: networkDetails.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: new StellarSdk.Asset(assetCode, assetIssuer),
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
        setErrorAsset(assetSubmitting);
        navigateTo(ROUTES.trustlineError);
      }
    }
  };

  // watch submitStatus if used ledger to send transaction
  useEffect(() => {
    if (submitStatus === ActionStatus.ERROR) {
      setErrorAsset(assetSubmitting);
      navigateTo(ROUTES.trustlineError);
    } else if (submitStatus === ActionStatus.SUCCESS) {
      dispatch(resetSubmission());
      navigateTo(ROUTES.account);
    }
  }, [submitStatus, assetSubmitting, setErrorAsset, dispatch]);

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
        ? resp.records[0].flags.auth_revocable
        : false;
    } catch (e) {
      console.error(e);
    }

    // check if new asset
    // TODO: stellar expert asset rating endpoint giving 403, resolve with OL
    const isNewAsset = false;

    // check domain
    let isInvalidDomain = false;
    try {
      const resp = await StellarSdk.StellarTomlResolver.resolve(domain);
      let found = false;
      resp.CURRENCIES.forEach((c: { code: string; issuer: string }) => {
        if (c.code === code && c.issuer === issuer) {
          found = true;
        }
      });
      isInvalidDomain = !found;
    } catch (e) {
      console.error(e);
      isInvalidDomain = true;
    }

    return { isRevocable, isNewAsset, isInvalidDomain };
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
          setErrorAsset={setErrorAsset}
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
          setErrorAsset={setErrorAsset}
        />
      )}
      <SimpleBar
        className="ManageAssetRows__scrollbar"
        style={{
          maxHeight: `${maxHeight}px`,
        }}
      >
        {header}
        <div className="ManageAssetRows__content">
          {assetRows.map(({ code, domain, image, issuer }) => {
            if (!balances) return null;
            const canonicalAsset = getCanonicalFromAsset(code, issuer);
            const isTrustlineActive = Object.keys(balances).some(
              (balance) => balance === canonicalAsset,
            );
            const isActionPending = submitStatus === ActionStatus.PENDING;

            return (
              <div className="ManageAssetRows__row" key={canonicalAsset}>
                <ManageAssetRow
                  code={code}
                  issuer={issuer}
                  image={image}
                  domain={domain}
                />
                <div className="ManageAssetRows__button">
                  <PillButton
                    disabled={isActionPending}
                    isLoading={
                      isActionPending && assetSubmitting === canonicalAsset
                    }
                    onClick={async () => {
                      const resp = await checkForSuspiciousAsset(
                        code,
                        issuer,
                        domain,
                      );
                      if (
                        resp.isInvalidDomain ||
                        resp.isRevocable ||
                        resp.isNewAsset
                      ) {
                        setShowNewAssetWarning(true);
                        setNewAssetFlags(resp);
                        setSuspiciousAssetData({ domain, image, code, issuer });
                      } else if (
                        isBlockedDomain(domain) &&
                        !isTrustlineActive
                      ) {
                        setShowBlockedDomainWarning(true);
                        setSuspiciousAssetData({ domain, image, code, issuer });
                      } else {
                        changeTrustline(code, issuer, !isTrustlineActive);
                      }
                    }}
                    type="button"
                  >
                    {isTrustlineActive ? t("Remove") : t("Add")}
                  </PillButton>
                </div>
              </div>
            );
          })}
        </div>
        {children}
      </SimpleBar>
      <LoadingBackground
        onClick={() => {}}
        isActive={showNewAssetWarning || showBlockedDomainWarning}
      />
    </>
  );
};

interface AssetRowData {
  code: string;
  issuer: string;
  image: string;
  domain: string;
}

export const ManageAssetRow = ({
  code,
  issuer,
  image,
  domain,
}: AssetRowData) => {
  const canonicalAsset = getCanonicalFromAsset(code, issuer);
  const isScamAsset = useIsScamAsset(code, issuer);
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
          <span className="ManageAssetRows__scam-asset">
            {isScamAsset && <img src={IconWarning} alt="warning" />}
          </span>
        </div>
        <div className="ManageAssetRows__domain">{formatDomain(domain)}</div>
      </div>
    </>
  );
};
