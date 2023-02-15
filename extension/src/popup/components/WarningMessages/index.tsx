import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { POPUP_HEIGHT } from "constants/dimensions";
import StellarSdk, { Account } from "stellar-sdk";

import { RequestStatus } from "@shared/api/types";

import { xlmToStroop } from "helpers/stellar";
import { AppDispatch } from "popup/App";
import { Button } from "popup/basics/buttons/Button";
import { InfoBlock } from "popup/basics/InfoBlock";
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
import {
  ManageAssetRow,
  NewAssetFlags,
} from "popup/components/manageAssets/ManageAssetRows";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
} from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";
import IconShieldCross from "popup/assets/icon-shield-cross.svg";
import IconInvalid from "popup/assets/icon-invalid.svg";
import IconWarning from "popup/assets/icon-warning.svg";

import "./styles.scss";

const DirectoryLink = () => {
  const { t } = useTranslation();
  return (
    <a href="https://stellar.expert/directory" target="_blank" rel="noreferrer">
      stellar.expert's {t("directory")}
    </a>
  );
};

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
        <Icon.AlertTriangle className="WarningMessage__icon" />
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
          variant={Button.variant.tertiary}
          fullWidth
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

const DangerousAccountWarning = ({
  isUnsafe,
  isMalicious,
}: {
  isUnsafe: boolean;
  isMalicious: boolean;
}) => {
  const { t } = useTranslation();

  if (isMalicious) {
    return (
      <WarningMessage
        header="Malicious account detected"
        variant={WarningMessageVariant.highAlert}
      >
        <p>
          {t("An account you’re interacting with is tagged as malicious on")}{" "}
          <DirectoryLink />.
        </p>
        <p>{t("For your safety, signing this transaction is disabled")}</p>
      </WarningMessage>
    );
  }
  if (isUnsafe) {
    return (
      <WarningMessage
        header="Unsafe account"
        variant={WarningMessageVariant.warning}
      >
        <p>
          {t("An account you’re interacting with is tagged as unsafe on")}{" "}
          <DirectoryLink />. {t("Please proceed with caution.")}
        </p>
      </WarningMessage>
    );
  }

  return null;
};

const MemoWarningMessage = ({
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
  isUnsafe: boolean;
  isMemoRequired: boolean;
  isMalicious: boolean;
}

export const FlaggedWarningMessage = ({
  isUnsafe,
  isMemoRequired,
  isMalicious,
}: FlaggedWarningMessageProps) => (
  <>
    <DangerousAccountWarning isUnsafe={isUnsafe} isMalicious={isMalicious} />
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
          <Icon.AlertTriangle className="WarningMessage__icon" />
          <div>{t("IMPORTANT")}</div>
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

export const ScamAssetWarning = ({
  isSendWarning = false,
  domain,
  code,
  issuer,
  image,
  onClose,
  onContinue = () => {},
}: {
  isSendWarning?: boolean;
  domain: string;
  code: string;
  issuer: string;
  image: string;
  onClose: () => void;
  onContinue?: () => void;
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

  const closeOverlay = () => {
    if (warningRef.current) {
      warningRef.current.style.bottom = `-${POPUP_HEIGHT}px`;
    }
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // animate entry
  useEffect(() => {
    if (warningRef.current) {
      setTimeout(() => {
        warningRef.current!.style.bottom = "0";
      }, 10);
    }
  }, [warningRef]);

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const server = new StellarSdk.Server(networkDetails.networkUrl);
    const sourceAccount: Account = await server.loadAccount(publicKey);
    const transactionXDR = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: xlmToStroop(recommendedFee).toFixed(),
      networkPassphrase: networkDetails.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: new StellarSdk.Asset(code, issuer),
        }),
      )
      .setTimeout(180)
      .build()
      .toXDR();

    if (isHardwareWallet) {
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
          navigateTo(ROUTES.trustlineError);
        }
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="ScamAssetWarning">
      <div className="ScamAssetWarning__wrapper" ref={warningRef}>
        <div className="ScamAssetWarning__header">Warning</div>
        <div className="ScamAssetWarning__description">
          {t(
            "This asset was tagged as fraudulent by stellar.expert, a reliable community-maintained directory.",
          )}
        </div>
        <div className="ScamAssetWarning__row">
          <ManageAssetRow
            code={code}
            issuer={issuer}
            image={image}
            domain={domain}
          />
        </div>
        <div className="ScamAssetWarning__bottom-content">
          <div>
            {isSendWarning ? (
              <InfoBlock variant={InfoBlock.variant.error}>
                <p>
                  {t(
                    "Trading or sending this asset is not recommended. Projects related to this asset may be fraudulent even if the creators say otherwise.",
                  )}
                </p>
              </InfoBlock>
            ) : (
              <InfoBlock variant={InfoBlock.variant.error}>
                <div>
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
                    <strong>{t("Settings > Preferences")}</strong>
                  </p>
                </div>
              </InfoBlock>
            )}
          </div>
          <div className="ScamAssetWarning__btns">
            <Button
              fullWidth
              variant={Button.variant.tertiary}
              type="button"
              onClick={closeOverlay}
            >
              {isValidatingSafeAssetsEnabled ? t("Got it") : t("Cancel")}
            </Button>
            {isSendWarning && (
              <Button
                fullWidth
                onClick={onContinue}
                type="button"
                isLoading={
                  isSubmitting || submitStatus === RequestStatus.PENDING
                }
              >
                {t("Continue")}
              </Button>
            )}
            {!isValidatingSafeAssetsEnabled && !isSendWarning && (
              <Button
                fullWidth
                onClick={handleSubmit}
                type="button"
                isLoading={
                  isSubmitting || submitStatus === RequestStatus.PENDING
                }
              >
                {t("Add anyway")}
              </Button>
            )}
          </div>{" "}
        </div>
      </div>
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

  const { isRevocable, isNewAsset, isInvalidDomain } = newAssetFlags;

  // animate entry
  useEffect(() => {
    if (warningRef.current) {
      setTimeout(() => {
        warningRef.current!.style.bottom = "0";
      }, 10);
    }
  }, [warningRef]);

  const closeOverlay = () => {
    if (warningRef.current) {
      warningRef.current.style.bottom = `-${POPUP_HEIGHT}px`;
    }
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    const server = new StellarSdk.Server(networkDetails.networkUrl);
    const sourceAccount: Account = await server.loadAccount(publicKey);
    const transactionXDR = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: xlmToStroop(recommendedFee).toFixed(),
      networkPassphrase: networkDetails.networkPassphrase,
    })
      .addOperation(
        StellarSdk.Operation.changeTrust({
          asset: new StellarSdk.Asset(code, issuer),
        }),
      )
      .setTimeout(180)
      .build()
      .toXDR();

    if (isHardwareWallet) {
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
          navigateTo(ROUTES.trustlineError);
        }
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="NewAssetWarning">
      <div className="NewAssetWarning__wrapper" ref={warningRef}>
        <div className="NewAssetWarning__header">
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
              fullWidth
              variant={Button.variant.tertiary}
              type="button"
              onClick={closeOverlay}
            >
              {t("Cancel")}
            </Button>
            <Button
              fullWidth
              onClick={handleSubmit}
              type="button"
              isLoading={isSubmitting}
            >
              {t("Add asset")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
