import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";
import { useTranslation, Trans } from "react-i18next";
import { POPUP_HEIGHT } from "constants/dimensions";
import {
  Account,
  Asset,
  Operation,
  Horizon,
  TransactionBuilder,
} from "stellar-sdk";
import { captureException } from "@sentry/browser";

import { ActionStatus } from "@shared/api/types";
import { getTokenDetails } from "@shared/api/internal";
import { TokenArgsDisplay } from "@shared/api/helpers/soroban";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";

import { xlmToStroop, isMainnet, isTestnet } from "helpers/stellar";

import { AppDispatch } from "popup/App";
import {
  signFreighterTransaction,
  submitFreighterTransaction,
  startHwSign,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import {
  settingsSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { ModalInfo } from "popup/components/ModalInfo";
import {
  ManageAssetRow,
  NewAssetFlags,
} from "popup/components/manageAssets/ManageAssetRows";
import { SorobanTokenIcon } from "popup/components/account/AccountAssets";
import { TrustlineError } from "popup/components/manageAssets/TrustlineError";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import { View } from "popup/basics/layout/View";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { getManageAssetXDR } from "popup/helpers/getManageAssetXDR";
import { checkForSuspiciousAsset } from "popup/helpers/checkForSuspiciousAsset";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";
import IconShieldCross from "popup/assets/icon-shield-cross.svg";
import IconInvalid from "popup/assets/icon-invalid.svg";
import IconWarning from "popup/assets/icon-warning.svg";
import IconUnverified from "popup/assets/icon-unverified.svg";
import IconNewAsset from "popup/assets/icon-new-asset.svg";
import IconShieldBlockaid from "popup/assets/icon-shield-blockaid.svg";
import IconWarningBlockaid from "popup/assets/icon-warning-blockaid.svg";
import { getVerifiedTokens } from "popup/helpers/searchAsset";
import { BlockAidScanTxResult } from "popup/helpers/blockaid";
import { CopyValue } from "../CopyValue";

import "./styles.scss";

export enum WarningMessageVariant {
  default = "",
  highAlert = "high-alert",
  warning = "warning",
}

interface WarningMessageProps {
  header: string;
  children: React.ReactNode;
  handleCloseClick?: () => void;
  isActive?: boolean;
  variant: WarningMessageVariant;
}

export const WarningMessage = ({
  handleCloseClick,
  header,
  isActive = false,
  variant,
  children,
}: WarningMessageProps) => {
  const { t } = useTranslation();
  const [isWarningActive, setIsWarningActive] = useState(isActive);

  const WarningInfoBlock = ({
    children: headerChildren,
  }: {
    children?: React.ReactNode;
  }) => (
    <div
      className={`WarningMessage__infoBlock WarningMessage__infoBlock--${variant}`}
      data-testid="WarningMessage"
    >
      <div className="WarningMessage__header">
        {variant ? (
          <Icon.Warning className="WarningMessage__icon" />
        ) : (
          <Icon.Info className="WarningMessage__default-icon" />
        )}
        <div>{header}</div>
        {headerChildren}
      </div>
    </div>
  );

  return isWarningActive ? (
    createPortal(
      <div className="WarningMessage--active">
        <WarningInfoBlock />
        <div className="WarningMessage__children-wrapper">{children}</div>
        <Button
          size="md"
          variant="secondary"
          isFullWidth
          type="button"
          onClick={() =>
            handleCloseClick ? handleCloseClick() : setIsWarningActive(false)
          }
        >
          {t("Got it")}
        </Button>
      </div>,
      document.querySelector("#modal-root")!,
    )
  ) : (
    <div
      className="WarningMessage__activate-button"
      onClick={() => setIsWarningActive(true)}
    >
      <WarningInfoBlock>
        <div className="WarningMessage__link-wrapper">
          <Icon.ChevronRight className="WarningMessage__link-icon" />
        </div>
      </WarningInfoBlock>
    </div>
  );
};

export const MemoWarningMessage = ({
  isMemoRequired,
}: {
  isMemoRequired: boolean;
}) => {
  const { t } = useTranslation();

  return isMemoRequired ? (
    <WarningMessage
      header="Memo is required"
      variant={WarningMessageVariant.highAlert}
    >
      <p>
        {t(
          "A destination account requires the use of the memo field which is not present in the transaction you’re about to sign. Freighter automatically disabled the option to sign this transaction.",
        )}
      </p>

      <p>
        {t(
          "Check the destination account memo requirements and include it in the transaction.",
        )}
      </p>
    </WarningMessage>
  ) : null;
};

interface FlaggedWarningMessageProps {
  code: string;
  issuer: string;
  isMemoRequired: boolean;
  isMalicious: boolean;
}

export const FlaggedWarningMessage = ({
  code,
  issuer,
  isMemoRequired,
  isMalicious,
}: FlaggedWarningMessageProps) => (
  <>
    {isMalicious ? <BlockaidAssetWarning code={code} issuer={issuer} /> : null}
    <MemoWarningMessage isMemoRequired={isMemoRequired} />
  </>
);

export const FirstTimeWarningMessage = () => {
  const { t } = useTranslation();

  return (
    <WarningMessage
      header="First Time Interaction"
      variant={WarningMessageVariant.warning}
    >
      <p>
        {t(
          "If you believe you have interacted with this domain before, it is possible that scammers have copied the original site and/or made small changes to the domain name, and that this site is a scam.",
        )}
      </p>
      <p>
        {t(
          "Double check the domain name. If it is incorrect in any way, do not share your public key and contact the site administrator via a verified email or social media account to confirm that this domain is correct.",
        )}
      </p>
    </WarningMessage>
  );
};

export const BackupPhraseWarningMessage = () => {
  const { t } = useTranslation();

  return (
    <div className="WarningMessage__backup">
      <div className="WarningMessage__infoBlock">
        <div className="WarningMessage__header">
          <Icon.Warning className="WarningMessage__icon" />
          <div>{t("Important")}</div>
        </div>

        <p>
          {t(
            "Keep your recovery phrase in a safe and secure place. Anyone who has access to this phrase has access to your account and to the funds in it, so save it in a safe and secure place.",
          )}
        </p>
      </div>
    </div>
  );
};

interface BlockaidAssetWarningProps {
  code?: string;
  issuer?: string;
  isNewAsset?: boolean;
}

export const BlockaidAssetWarning = ({
  isNewAsset,
  code,
  issuer,
}: BlockaidAssetWarningProps) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [isNewAssetState, setIsNewAssetState] = useState(false);

  useEffect(() => {
    const fetchSuspiciousAsset = async (
      assetCode: string,
      assetIssuer: string,
    ) => {
      const server = stellarSdkServer(
        networkDetails.networkUrl,
        networkDetails.networkPassphrase,
      );
      const resp = await checkForSuspiciousAsset({
        code: assetCode,
        issuer: assetIssuer,
        domain: "",
        server,
        networkDetails,
      });

      setIsNewAssetState(resp.isNewAsset);
    };

    if (isNewAsset === undefined && code && issuer) {
      fetchSuspiciousAsset(code, issuer);
    }
  }, [code, issuer, isNewAsset, networkDetails]);

  return (
    <div className="ScamAssetWarning__box">
      <div className="Icon">
        <img
          className="ScamAssetWarning__box__icon"
          src={IconWarningBlockaid}
          alt="icon warning blockaid"
        />
      </div>
      <div>
        <div className="ScamAssetWarning__description">
          {t(
            "This token was flagged as malicious by Blockaid. Interacting with this token may result in loss of funds and is not recommended for the following reasons",
          )}
          :
          <ul className="ScamAssetWarning__list">
            <li>{t("Identified as a scam")}</li>

            {isNewAssetState ? <li>{t("New asset")}</li> : ""}
          </ul>
        </div>
        <div className="ScamAssetWarning__footer">
          <img src={IconShieldBlockaid} alt="icon shield blockaid" />
          {t("Powered by ")}
          <a rel="noreferrer" href="https://www.blockaid.io/" target="_blank">
            Blockaid
          </a>
        </div>
      </div>
    </div>
  );
};

export const ScamAssetWarning = ({
  pillType,
  isSendWarning = false,
  domain,
  code,
  issuer,
  onClose,
  // eslint-disable-next-line
  onContinue = () => {},
  blockaidWarning,
  isNewAsset,
}: {
  pillType: "Connection" | "Trustline" | "Transaction";
  isSendWarning?: boolean;
  domain: string;
  code: string;
  issuer: string;
  onClose: () => void;
  onContinue?: () => void;
  blockaidWarning: string;
  isNewAsset: boolean;
}) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const warningRef = useRef<HTMLDivElement>(null);
  const { isValidatingSafeAssetsEnabled } = useSelector(settingsSelector);
  const { recommendedFee } = useNetworkFees();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const { submitStatus } = useSelector(transactionSubmissionSelector);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);
  const [isTrustlineErrorShowing, setIsTrustlineErrorShowing] = useState(false);

  const closeOverlay = () => {
    if (warningRef.current) {
      warningRef.current.style.bottom = `-${POPUP_HEIGHT}px`;
    }
    const timeout = setTimeout(() => {
      onClose();
      clearTimeout(timeout);
    }, 300);
  };

  // animate entry
  useEffect(() => {
    if (warningRef.current) {
      const timeout = setTimeout(() => {
        // Adding extra check to fix flaky tests
        if (warningRef.current) {
          warningRef.current.style.bottom = "0";
        }
        clearTimeout(timeout);
      }, 10);
    }
  }, [warningRef]);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const server = new Horizon.Server(networkDetails.networkUrl);
    const sourceAccount: Account = await server.loadAccount(publicKey);
    const transactionXDR = new TransactionBuilder(sourceAccount, {
      fee: xlmToStroop(recommendedFee).toFixed(),
      networkPassphrase: networkDetails.networkPassphrase,
    })
      .addOperation(
        Operation.changeTrust({
          asset: new Asset(code, issuer),
        }),
      )
      .setTimeout(180)
      .build()
      .toXDR();

    if (isHardwareWallet) {
      // eslint-disable-next-line
      await dispatch(startHwSign({ transactionXDR, shouldSubmit: true }));
      emitMetric(METRIC_NAMES.manageAssetAddUnsafeAsset, { code, issuer });
    } else {
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
          navigateTo(ROUTES.account);
          emitMetric(METRIC_NAMES.manageAssetAddUnsafeAsset, { code, issuer });
        } else {
          setIsTrustlineErrorShowing(true);
        }
      }
    }
    setIsSubmitting(false);
  };

  return isTrustlineErrorShowing ? (
    createPortal(
      <TrustlineError handleClose={() => closeOverlay()} />,
      document.querySelector("#modal-root")!,
    )
  ) : (
    <div className="ScamAssetWarning">
      <View.Content>
        <ModalInfo
          domain={domain}
          variant={blockaidWarning === "Malicious" ? "malicious" : "default"}
          subject=""
          pillType={pillType}
        >
          <div className="ScamAssetWarning__wrapper" ref={warningRef}>
            <div>
              {isSendWarning ? (
                <Notification
                  variant="error"
                  title={t("Not recommended asset")}
                >
                  <p>
                    {t(
                      "Trading or sending this asset is not recommended. Projects related to this asset may be fraudulent even if the creators say otherwise.",
                    )}
                  </p>
                </Notification>
              ) : (
                <BlockaidAssetWarning
                  isNewAsset={isNewAsset}
                  code={code}
                  issuer={issuer}
                />
              )}
            </div>
            <div className="ScamAssetWarning__btns">
              {!isValidatingSafeAssetsEnabled && !isSendWarning && (
                <Button
                  size="md"
                  isFullWidth
                  onClick={handleSubmit}
                  type="button"
                  variant="error"
                  isLoading={
                    isSubmitting || submitStatus === ActionStatus.PENDING
                  }
                >
                  {t("Sign anyway")}
                </Button>
              )}
              <Button
                size="md"
                isFullWidth
                variant="secondary"
                type="button"
                onClick={closeOverlay}
              >
                {isValidatingSafeAssetsEnabled ? t("Got it") : t("Cancel")}
              </Button>
              {isSendWarning && (
                <Button
                  size="md"
                  isFullWidth
                  onClick={onContinue}
                  type="button"
                  variant="primary"
                  isLoading={
                    isSubmitting || submitStatus === ActionStatus.PENDING
                  }
                >
                  {t("Continue")}
                </Button>
              )}
            </div>{" "}
          </div>
        </ModalInfo>
      </View.Content>
    </div>
  );
};

export const NewAssetWarning = ({
  domain,
  code,
  issuer,
  image,
  newAssetFlags,
  onClose,
}: {
  domain: string;
  code: string;
  issuer: string;
  image: string;
  newAssetFlags: NewAssetFlags;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const warningRef = useRef<HTMLDivElement>(null);
  const { recommendedFee } = useNetworkFees();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);
  const [isTrustlineErrorShowing, setIsTrustlineErrorShowing] = useState(false);

  const { isRevocable, isNewAsset, isInvalidDomain } = newAssetFlags;

  useEffect(
    () => () => {
      setIsSubmitting(false);
    },
    [],
  );

  // animate entry
  useEffect(() => {
    if (warningRef.current) {
      const timeout = setTimeout(() => {
        // Adding extra check to fix flaky tests
        if (warningRef.current) {
          warningRef.current.style.bottom = "0";
        }
        clearTimeout(timeout);
      }, 10);
    }
  }, [warningRef]);

  const closeOverlay = () => {
    if (warningRef.current) {
      warningRef.current.style.bottom = `-${POPUP_HEIGHT}px`;
    }
    const timeout = setTimeout(() => {
      onClose();
      clearTimeout(timeout);
    }, 300);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const server = new Horizon.Server(networkDetails.networkUrl);
    const transactionXDR = await getManageAssetXDR({
      publicKey,
      assetCode: code,
      assetIssuer: issuer,
      addTrustline: true,
      server,
      recommendedFee,
      networkDetails,
    });

    if (isHardwareWallet) {
      // eslint-disable-next-line
      await dispatch(startHwSign({ transactionXDR, shouldSubmit: true }));
      emitMetric(METRIC_NAMES.manageAssetAddUnsafeAsset, { code, issuer });
    } else {
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
          navigateTo(ROUTES.account);
          emitMetric(METRIC_NAMES.manageAssetAddUnsafeAsset, { code, issuer });
        } else {
          setIsTrustlineErrorShowing(true);
        }
      }
    }
    setIsSubmitting(false);
  };

  return isTrustlineErrorShowing ? (
    createPortal(
      <TrustlineError handleClose={() => closeOverlay()} />,
      document.querySelector("#modal-root")!,
    )
  ) : (
    <div className="NewAssetWarning" data-testid="NewAssetWarning">
      <View.Content>
        <div className="NewAssetWarning__wrapper" ref={warningRef}>
          <div
            className="NewAssetWarning__header"
            data-testid="NewAssetWarningTitle"
          >
            {t("Before You Add This Asset")}
          </div>
          <div className="NewAssetWarning__description">
            {t(
              "Please double-check its information and characteristics. This can help you identify fraudulent assets.",
            )}
          </div>
          <div className="NewAssetWarning__row">
            <ManageAssetRow
              code={code}
              issuer={issuer}
              image={image}
              domain={domain}
            />
          </div>
          <hr className="NewAssetWarning__list-divider" />
          <div className="NewAssetWarning__flags">
            {isRevocable && (
              <div className="NewAssetWarning__flag">
                <div className="NewAssetWarning__flag__icon">
                  <img src={IconShieldCross} alt="revocable" />
                </div>
                <div className="NewAssetWarning__flag__content">
                  <div className="NewAssetWarning__flag__header">
                    {t("Revocable Asset")}
                  </div>
                  <div className="NewAssetWarning__flag__description">
                    {t(
                      "The asset creator can revoke your access to this asset at anytime",
                    )}
                  </div>
                </div>
              </div>
            )}
            <div>
              {isNewAsset && (
                <div className="NewAssetWarning__flag">
                  <div className="NewAssetWarning__flag__icon">
                    <img src={IconInvalid} alt="new asset" />
                  </div>
                  <div className="NewAssetWarning__flag__content">
                    <div className="NewAssetWarning__flag__header">
                      {t("New Asset")}
                    </div>
                    <div className="NewAssetWarning__flag__description">
                      {t("This is a relatively new asset.")}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div>
              {isInvalidDomain && (
                <div className="NewAssetWarning__flag">
                  <div className="NewAssetWarning__flag__icon">
                    <img src={IconWarning} alt="invalid domain" />
                  </div>
                  <div className="NewAssetWarning__flag__content">
                    <div className="NewAssetWarning__flag__header">
                      {t("Invalid Format Asset")}
                    </div>
                    <div className="NewAssetWarning__flag__description">
                      {t(
                        "Asset home domain doesn’t exist, TOML file format is invalid, or asset doesn't match currency description",
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="NewAssetWarning__btns">
              <Button
                size="md"
                isFullWidth
                variant="secondary"
                type="button"
                onClick={closeOverlay}
              >
                {t("Cancel")}
              </Button>
              <Button
                size="md"
                isFullWidth
                variant="primary"
                onClick={handleSubmit}
                type="button"
                isLoading={isSubmitting}
                data-testid="NewAssetWarningAddButton"
              >
                {t("Add asset")}
              </Button>
            </div>
          </div>
        </div>
      </View.Content>
    </div>
  );
};

export const UnverifiedTokenNotification = () => {
  const { t } = useTranslation();

  return (
    <Notification
      title={t(
        "This asset is not part of an asset list. Please, double-check the asset you’re interacting with and proceed with care. Freighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.",
      )}
      variant="warning"
    />
  );
};

export const TokenWarning = ({
  domain,
  code,
  onClose,
  isVerifiedToken,
  verifiedLists = [],
  handleAddToken,
}: {
  domain: string;
  code: string;
  onClose: () => void;
  isVerifiedToken: boolean;
  verifiedLists?: string[];
  handleAddToken: null | (() => Promise<void>);
}) => {
  const { t } = useTranslation();
  const warningRef = useRef<HTMLDivElement>(null);
  const { submitStatus } = useSelector(transactionSubmissionSelector);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const closeOverlay = () => {
    if (warningRef.current) {
      warningRef.current.style.marginBottom = `-${POPUP_HEIGHT}px`;
    }
    const timeout = setTimeout(() => {
      onClose();
      clearTimeout(timeout);
    }, 300);
  };

  // animate entry
  useEffect(() => {
    if (warningRef.current) {
      const timeout = setTimeout(() => {
        // Adding extra check to fix flaky tests
        if (warningRef.current) {
          warningRef.current.style.marginBottom = "0";
        }
        clearTimeout(timeout);
      }, 10);
    }
  }, [warningRef]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    if (handleAddToken) {
      await handleAddToken();
    }

    setIsSubmitting(false);
    closeOverlay();
  };

  return createPortal(
    <>
      <LoadingBackground isActive isOpaque />
      <div className="TokenWarning" data-testid="TokenWarning">
        <View.Content>
          <div className="TokenWarning__wrapper" ref={warningRef}>
            <div className="TokenWarning__heading">
              <div className="TokenWarning__icon">
                <SorobanTokenIcon noMargin />
              </div>
              <div className="TokenWarning__code">{code}</div>
              <div className="TokenWarning__domain">{domain}</div>
              <div className="TokenWarning__description">
                <div className="TokenWarning__description__icon">
                  <Icon.VerifiedUser />
                </div>
                <div className="TokenWarning__description__text">
                  {t("Add Asset Trustline")}
                </div>
              </div>
            </div>
            <div data-testid="token-warning-notification">
              {isVerifiedToken ? (
                <Notification
                  title={`${t(
                    "This asset is part of the asset lists",
                  )} "${verifiedLists.join(", ")}."`}
                  variant="primary"
                >
                  {t(
                    "Freighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.",
                  )}
                </Notification>
              ) : (
                <UnverifiedTokenNotification />
              )}
            </div>

            <div className="TokenWarning__flags">
              <div className="TokenWarning__flags__info">{t("Asset Info")}</div>

              {isVerifiedToken ? null : (
                <div className="TokenWarning__flag">
                  <div className="TokenWarning__flag__icon">
                    <img src={IconUnverified} alt="unverified icon" />
                  </div>
                  <div className="TokenWarning_flag__content">
                    <div className="TokenWarning__flag__header TokenWarning__flag__icon--unverified">
                      {t("Unverified asset")}
                    </div>
                    <div className="TokenWarning__flag__content">
                      {t("Proceed with caution")}
                    </div>
                  </div>
                </div>
              )}
              <div className="TokenWarning__flag">
                <div className="TokenWarning__flag__icon">
                  <img src={IconNewAsset} alt="new asset icon" />
                </div>
                <div className="TokenWarning_flag__content">
                  <div className="TokenWarning__flag__header TokenWarning__flag__icon">
                    {t("New asset")}
                  </div>
                  <div className="TokenWarning__flag__content">
                    {t("This is a relatively new asset")}
                  </div>
                </div>
              </div>
            </div>

            <div className="TokenWarning__bottom-content">
              <div className="ScamAssetWarning__btns">
                <Button
                  size="md"
                  isFullWidth
                  variant="secondary"
                  type="button"
                  onClick={closeOverlay}
                >
                  {t("Cancel")}
                </Button>
                <Button
                  data-testid="add-asset"
                  size="md"
                  isFullWidth
                  onClick={handleSubmit}
                  type="button"
                  variant="primary"
                  isLoading={
                    isSubmitting || submitStatus === ActionStatus.PENDING
                  }
                >
                  {t("Add asset")}
                </Button>
              </div>{" "}
            </div>
          </div>
        </View.Content>
      </div>
    </>,
    document.querySelector("#modal-root")!,
  );
};

export const TransferWarning = ({
  transfers,
}: {
  transfers: TokenArgsDisplay[];
}) => {
  const { t } = useTranslation();

  if (!transfers.length) {
    return null;
  }

  return (
    <WarningMessage
      header="Authorizes a token transfer. Proceed with caution."
      variant={WarningMessageVariant.warning}
    >
      <div className="TokenTransferWarning">
        <p>
          {t(
            "This invocation authorizes the following transfers, please review the invocation tree and confirm that you want to proceed.",
          )}
        </p>
        {transfers.map((transfer, i) => (
          <WarningMessageTokenDetails
            index={i}
            transfer={transfer}
            key={`${transfer.contractId}-${transfer.amount}-${transfer.to}`}
          />
        ))}
      </div>
    </WarningMessage>
  );
};

export const InvokerAuthWarning = () => {
  const { t } = useTranslation();

  return (
    <WarningMessage
      header="Your account is signing this authorization. Proceed with caution."
      variant={WarningMessageVariant.default}
    >
      <div className="InvokerAuthWarning">
        <p>
          {t(
            "This authorization uses the source account's credentials, so you are implicitly authorizing this when you sign the transaction.",
          )}
        </p>
      </div>
    </WarningMessage>
  );
};

export const UnverifiedTokenTransferWarning = ({
  transfers,
}: {
  transfers: TokenArgsDisplay[];
}) => {
  const { t } = useTranslation();
  const { networkDetails, assetsLists } = useSelector(settingsSelector);
  const [isUnverifiedToken, setIsUnverifiedToken] = useState(false);

  useEffect(() => {
    if (!isMainnet(networkDetails) && !isTestnet(networkDetails)) {
      return;
    }
    const fetchVerifiedTokens = async () => {
      // eslint-disable-next-line
      for (let j = 0; j < transfers.length; j += 1) {
        const c = transfers[j].contractId;
        const verifiedTokens = await getVerifiedTokens({
          contractId: c,
          networkDetails,
          assetsLists,
        });
        if (!verifiedTokens.length) {
          setIsUnverifiedToken(true);
        }
      }
    };

    fetchVerifiedTokens();
  }, [networkDetails, transfers, assetsLists]);

  return isUnverifiedToken ? (
    <WarningMessage
      header="This asset is not on an asset list"
      variant={WarningMessageVariant.default}
    >
      <div className="TokenTransferWarning">
        <p>
          {t(
            `This asset is not part of any of your enabled asset lists (${networkDetails.network})`,
          )}
        </p>
      </div>
    </WarningMessage>
  ) : null;
};

const WarningMessageTokenDetails = ({
  transfer,
  index,
}: {
  transfer: { contractId: string; amount: string; to: string };
  index: number;
}) => {
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const [isLoadingTokenDetails, setLoadingTokenDetails] = React.useState(false);
  const [tokenDetails, setTokenDetails] = React.useState(
    {} as Record<string, { name: string; symbol: string }>,
  );
  React.useEffect(() => {
    async function _getTokenDetails() {
      setLoadingTokenDetails(true);
      const _tokenDetails = {} as Record<
        string,
        { name: string; symbol: string }
      >;
      try {
        const tokenDetailsResponse = await getTokenDetails({
          contractId: transfer.contractId,
          publicKey,
          networkDetails,
        });

        if (!tokenDetailsResponse) {
          throw new Error("failed to fetch token details");
        }
        _tokenDetails[transfer.contractId] = tokenDetailsResponse;
      } catch (error) {
        // falls back to only showing contract ID
        captureException(
          `Failed to fetch token details - ${JSON.stringify(error)} - ${
            transfer.contractId
          } - ${networkDetails.network}`,
        );
        console.error(error);
      }
      setTokenDetails(_tokenDetails);
      setLoadingTokenDetails(false);
    }
    _getTokenDetails();
  }, [transfer.contractId, networkDetails, publicKey]);

  return (
    <div className="TokenDetails">
      <p className="FnName">TRANSFER #{index + 1}:</p>
      {/* eslint-disable-next-line */}
      {isLoadingTokenDetails ? (
        <div className="TokenDetails__loader">
          <Loader size="1rem" />
        </div>
      ) : tokenDetails[transfer.contractId] ? (
        <p>
          <span className="InlineLabel">Token:</span>{" "}
          {`(${
            tokenDetails[transfer.contractId].name === "native"
              ? "XLM"
              : tokenDetails[transfer.contractId].symbol
          }) ${tokenDetails[transfer.contractId].name}`}
        </p>
      ) : (
        <p>
          <span className="InlineLabel">Token: Unknown</span>
        </p>
      )}
      <p>
        <span className="InlineLabel">Contract ID:</span>
        <CopyValue
          value={transfer.contractId}
          displayValue={transfer.contractId}
        />
      </p>
      <p>
        <span className="InlineLabel">Amount:</span> {transfer.amount}
      </p>
      <p>
        <span className="InlineLabel">To:</span>
        <CopyValue value={transfer.to} displayValue={transfer.to} />
      </p>
    </div>
  );
};

export const SSLWarningMessage = ({ url }: { url: string }) => {
  const { t } = useTranslation();

  return (
    <WarningMessage
      handleCloseClick={() => window.close()}
      isActive
      variant={WarningMessageVariant.warning}
      header={t("WEBSITE CONNECTION IS NOT SECURE")}
    >
      <p>
        <Trans domain={url}>
          The website <strong>{url}</strong> does not use an SSL certificate.
          For additional safety Freighter only works with websites that provide
          an SSL certificate by default. You may enable connection to domains
          that do not use an SSL certificate in Settings &gt; Security &gt;
          Advanced Settings.
        </Trans>
      </p>
    </WarningMessage>
  );
};

export const BlockAidMissWarning = () => {
  const { t } = useTranslation();

  return (
    <WarningMessage
      header="Blockaid has not seen this domain"
      variant={WarningMessageVariant.default}
    >
      <div>
        <p>
          {t(
            "Proceed with caution. Blockaid is unable to provide a risk assesment for this domain at this time.",
          )}
        </p>
      </div>
    </WarningMessage>
  );
};

export const BlockaidMaliciousTxWarning = ({
  type,
}: {
  type: BlockAidScanTxResult["validation"]["result_type"];
}) => {
  const { t } = useTranslation();
  const details =
    type === "Malicious"
      ? {
          header: "This contract was flagged as malicious",
          variant: WarningMessageVariant.highAlert,
          message:
            "Proceed with caution. Blockaid has flagged this transaction as malicious.",
        }
      : {
          header: "This contract was flagged as suspicious",
          variant: WarningMessageVariant.warning,
          message:
            "Proceed with caution. Blockaid has flagged this transaction as suspicious.",
        };
  return (
    <WarningMessage header={details.header} variant={details.variant}>
      <div>
        <p>{t(details.message)}</p>
      </div>
    </WarningMessage>
  );
};
