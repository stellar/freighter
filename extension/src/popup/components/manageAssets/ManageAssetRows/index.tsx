import React, { useState, useEffect, useRef } from "react";
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

import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import {
  settingsNetworkDetailsSelector,
  settingsSelector,
} from "popup/ducks/settings";
import {
  ActionStatus,
  getAccountBalances,
  resetSubmission,
  signFreighterTransaction,
  submitFreighterTransaction,
  transactionSubmissionSelector,
  HwOverlayStatus,
  startHwSign,
  // ALEC TODO - move
  showBlockedDomainWarning,
  closeBlockedDomainWarning,
  BlockedDomainStatus,
} from "popup/ducks/transactionSubmission";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { LedgerSign } from "popup/components/hardwareConnect/LedgerSign";

// ALEC TODO - move
import { POPUP_HEIGHT } from "constants/dimensions";
import { Button, InfoBlock } from "@stellar/design-system";

import "./styles.scss";

export type ManageAssetCurrency = CURRENCY & { domain: string };

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
    blockedDomainStatus,
  } = useSelector(transactionSubmissionSelector);
  const [assetSubmitting, setAssetSubmitting] = useState("");
  const dispatch: AppDispatch = useDispatch();
  const { recommendedFee } = useNetworkFees();
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);

  const server = new StellarSdk.Server(networkDetails.networkUrl);

  // ALEC TODO - move to redux?
  // ALEC TODO - change defaults back to ""
  // ALEC TODO - do better, obviously
  const [blockedDomain, setBlockedDomain] = useState("lobstrr.co");
  const [blockedCode, setBlockedCode] = useState("BTC");
  const [blockedImage, setBlockedImage] = useState(
    "https://lobstrr.co/btctoken.png",
  );
  const [blockedIssuer, setBlockedIssuer] = useState(
    "GDWKS7O7RQY4ZRHPHLLMP63CGGNWCK72MP5J6FMVANA45ZI5WBJLQFHN",
  );

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
      navigateTo(ROUTES.trustlineError);
    }
  }, [submitStatus, assetSubmitting, setErrorAsset, dispatch]);

  // ALEC TODO - remove
  console.log({ blockedDomains });

  const isBlockedDomain = (domain: string) => {
    const found = blockedDomains.filter((b) => b.domain === domain);
    return found.length > 0;
  };

  // ALEC TODO - probably use an object arg or something
  const handleBlockedDomain = (
    domain: string,
    image: string,
    code: string,
    issuer: string,
  ) => {
    // ALEC TODO - remove
    console.log("warning modal slides up here");
    console.log({ domain });

    dispatch(showBlockedDomainWarning());
    setBlockedDomain(domain);
    setBlockedImage(image);
    setBlockedCode(code);
    setBlockedIssuer(issuer);
  };

  // ALEC TODO - move
  // ALEC TODO - name, BlockedDomainOverlay?
  const WarningModal = ({
    domain,
    code,
    issuer,
    image,
  }: {
    domain: string;
    code: string;
    issuer: string;
    image: string;
  }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const { isValidatingSafeAssetsEnabled } = useSelector(settingsSelector);

    const closeOverlay = () => {
      if (modalRef.current) {
        modalRef.current.style.bottom = `-${POPUP_HEIGHT}px`;
      }
      setTimeout(() => {
        dispatch(closeBlockedDomainWarning());
      }, 300);
    };

    // animate entry
    useEffect(() => {
      if (modalRef.current) {
        modalRef.current.style.bottom = "0";
      }
    }, [modalRef]);

    return (
      <div className="WarningModal">
        <div className="WarningModal__wrapper" ref={modalRef}>
          <div className="WarningModal__header">Warning</div>
          <div className="WarningModal__description">
            {t(
              "This asset was tagged as fraudulent by stellar.expert, a reliable community-maintained directory.",
            )}
          </div>
          {/* ALEC TODO - re-use from ManageAssetRows ? */}
          <div className="ManageAssetRows__row">
            <AssetIcon
              assetIcons={{ [getCanonicalFromAsset(code, issuer)]: image }}
              code={code}
              issuerKey={issuer}
            />
            <div className="ManageAssetRows__code">
              {code}
              <div className="ManageAssetRows__domain">
                {formatDomain(domain)}
              </div>
            </div>
          </div>

          <div className="WarningModal__bottom-content">
            <div>
              <InfoBlock variant={InfoBlock.variant.error}>
                <p>
                  {isValidatingSafeAssetsEnabled
                    ? t(
                        "Freighter automatically blocked this asset. Projects related to this asset may be fraudulent even if the creators say otherwise.",
                      )
                    : t(
                        "Projects related to this asset may be fraudulent even if the creators say otherwise. ",
                      )}
                </p>
                <p>
                  {t("You can")}{" "}
                  {`${
                    isValidatingSafeAssetsEnabled ? t("disable") : t("enable")
                  }`}{" "}
                  {t("this alert by going to")}{" "}
                  <strong>{t("Settings > Security")}</strong>
                </p>
              </InfoBlock>
            </div>
            <div className="WarningModal__btns">
              <Button
                fullWidth
                variant={Button.variant.tertiary}
                type="button"
                onClick={closeOverlay}
              >
                {t("Got it")}
              </Button>
              {!isValidatingSafeAssetsEnabled && (
                <Button fullWidth onClick={closeOverlay} type="button">
                  {/* ALEC TODO - handle add anyway onclick */}
                  {t("Add anyway")}
                </Button>
              )}
            </div>{" "}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ALEC TODO - test this with the hardware wallet */}
      {hwStatus === HwOverlayStatus.IN_PROGRESS && <LedgerSign />}
      {blockedDomainStatus === BlockedDomainStatus.IN_PROGRESS && (
        <WarningModal
          domain={blockedDomain}
          code={blockedCode}
          issuer={blockedIssuer}
          image={blockedImage}
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
                <AssetIcon
                  assetIcons={code !== "XLM" ? { [canonicalAsset]: image } : {}}
                  code={code}
                  issuerKey={issuer}
                />
                <div className="ManageAssetRows__code">
                  {code}
                  <div className="ManageAssetRows__domain">
                    {formatDomain(domain)}
                  </div>
                </div>
                <div className="ManageAssetRows__button">
                  <PillButton
                    disabled={isActionPending}
                    isLoading={
                      isActionPending && assetSubmitting === canonicalAsset
                    }
                    onClick={() => {
                      // ALEC TODO - better way of handling?
                      if (isBlockedDomain(domain)) {
                        handleBlockedDomain(domain, image, code, issuer);
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
        isActive={blockedDomainStatus === BlockedDomainStatus.IN_PROGRESS}
      />
    </>
  );
};
