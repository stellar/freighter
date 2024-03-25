import React, { useContext, useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import {
  Button,
  Icon,
  Loader,
  Link,
  Notification,
} from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { POPUP_HEIGHT } from "constants/dimensions";
import {
  Account,
  Asset,
  Operation,
  Horizon,
  TransactionBuilder,
  Networks,
  xdr,
} from "stellar-sdk";

import { ActionStatus } from "@shared/api/types";
import { getIndexerTokenDetails } from "@shared/api/internal";

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
import {
  ManageAssetRow,
  NewAssetFlags,
} from "popup/components/manageAssets/ManageAssetRows";
import { SorobanTokenIcon } from "popup/components/account/AccountAssets";
import { View } from "popup/basics/layout/View";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  publicKeySelector,
  hardwareWalletTypeSelector,
  addTokenId,
} from "popup/ducks/accountServices";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { getManageAssetXDR } from "popup/helpers/getManageAssetXDR";
import { pickTransfers, buildInvocationTree } from "popup/helpers/soroban";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";
import IconShieldCross from "popup/assets/icon-shield-cross.svg";
import IconInvalid from "popup/assets/icon-invalid.svg";
import IconWarning from "popup/assets/icon-warning.svg";
import { searchToken } from "popup/helpers/searchAsset";
import { captureException } from "@sentry/browser";
import { SorobanContext } from "popup/SorobanContext";
import { CopyValue } from "../CopyValue";

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

export const ScamAssetWarning = ({
  isSendWarning = false,
  domain,
  code,
  issuer,
  image,
  onClose,
  // eslint-disable-next-line
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
  const sorobanClient = useContext(SorobanContext);

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
            sorobanClient,
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
      <View.Content>
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
                <Notification variant="error" title={t("Blocked asset")}>
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
                        isValidatingSafeAssetsEnabled
                          ? t("disable")
                          : t("enable")
                      }`}{" "}
                      {t("this alert by going to")}{" "}
                      <strong>{t("Settings > Preferences")}</strong>
                    </p>
                  </div>
                </Notification>
              )}
            </div>
            <div className="ScamAssetWarning__btns">
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
              {!isValidatingSafeAssetsEnabled && !isSendWarning && (
                <Button
                  size="md"
                  isFullWidth
                  onClick={handleSubmit}
                  type="button"
                  variant="primary"
                  isLoading={
                    isSubmitting || submitStatus === ActionStatus.PENDING
                  }
                >
                  {t("Add anyway")}
                </Button>
              )}
            </div>{" "}
          </div>
        </div>
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
  const sorobanClient = useContext(SorobanContext);
  const warningRef = useRef<HTMLDivElement>(null);
  const { recommendedFee } = useNetworkFees();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);

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
            sorobanClient,
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

export const UnverifiedTokenWarning = ({
  domain,
  code,
  issuer,
  onClose,
}: {
  domain: string;
  code: string;
  issuer: string;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const warningRef = useRef<HTMLDivElement>(null);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
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
    await dispatch(
      addTokenId({
        publicKey,
        tokenId: issuer,
        network: networkDetails.network as Networks,
      }),
    );
    navigateTo(ROUTES.account);

    setIsSubmitting(false);
  };

  return (
    <div className="UnverifiedTokenWarning">
      <View.Content>
        <div className="UnverifiedTokenWarning__wrapper" ref={warningRef}>
          <div className="UnverifiedTokenWarning__heading">
            <div className="UnverifiedTokenWarning__icon">
              <SorobanTokenIcon noMargin />
            </div>
            <div className="UnverifiedTokenWarning__code">{code}</div>
            <div className="UnverifiedTokenWarning__domain">{domain}</div>
            <div className="UnverifiedTokenWarning__description">
              <div className="UnverifiedTokenWarning__description__icon">
                <Icon.VerifiedUser />
              </div>
              <div className="UnverifiedTokenWarning__description__text">
                {t("Add Asset Trustline")}
              </div>
            </div>
          </div>

          <Notification
            title={t(
              "Before you add this asset, please double-check its information and characteristics. This can help you identify fraudulent assets.",
            )}
            variant="warning"
          />
          <div className="UnverifiedTokenWarning__flags">
            <div className="UnverifiedTokenWarning__flags__info">
              {t("Asset Info")}
            </div>
            <div className="UnverifiedTokenWarning__flag">
              <div className="UnverifiedTokenWarning__flag__icon">
                <Icon.Info />
              </div>
              <div className="UnverifiedTokenWarning__flag__content">
                <div className="UnverifiedTokenWarning__flag__header UnverifiedTokenWarning__flags__icon--unverified">
                  {t(
                    "The asset is not part of Stellar Expert's top 50 assets list",
                  )}
                </div>
                <div className="UnverifiedTokenWarning__flag__description">
                  {t("This asset is not part of")}{" "}
                  <Link
                    isUnderline
                    variant="secondary"
                    href="https://api.stellar.expert/explorer/testnet/asset-list/top50"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Stellar Expert's top 50 assets list
                  </Link>
                  <br />
                  <Link
                    isUnderline
                    variant="secondary"
                    href="https://www.freighter.app/faq"
                  >
                    {t("Learn more")}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="UnverifiedTokenWarning__bottom-content">
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
  );
};

export const TransferWarning = ({
  authEntry,
}: {
  authEntry: xdr.SorobanAuthorizationEntry;
}) => {
  const { t } = useTranslation();

  const rootInvocation = authEntry.rootInvocation();
  const rootJson = buildInvocationTree(rootInvocation);
  const isInvokeContract = rootInvocation.function().switch().value === 0;
  const transfers = isInvokeContract ? pickTransfers(rootJson) : [];

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
  details,
}: {
  details: { contractId: string }[];
}) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [isUnverifiedToken, setIsUnverifiedToken] = useState(false);

  useEffect(() => {
    if (!isMainnet(networkDetails) && !isTestnet(networkDetails)) {
      return;
    }
    const fetchVerifiedTokens = async () => {
      const verifiedTokenRes = await searchToken({
        networkDetails,
        onError: (e) => console.error(e),
      });
      const verifiedTokens = [] as string[];

      // eslint-disable-next-line
      for (let i = 0; i < verifiedTokenRes.length; i += 1) {
        // eslint-disable-next-line
        for (let j = 0; j < details.length; j += 1) {
          if (details[j].contractId === verifiedTokenRes[i].contract) {
            verifiedTokens.push(details[j].contractId);
            return;
          }
        }
      }

      if (!verifiedTokens.length) {
        setIsUnverifiedToken(true);
      }
    };

    fetchVerifiedTokens();
  }, [networkDetails, details]);

  return isUnverifiedToken ? (
    <WarningMessage
      header="This asset is not on the asset list"
      variant={WarningMessageVariant.default}
    >
      <div className="TokenTransferWarning">
        <p>
          {t(
            `This asset is not part of the asset list by stellar.expert (${networkDetails.network})`,
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
    async function getTokenDetails() {
      setLoadingTokenDetails(true);
      const _tokenDetails = {} as Record<
        string,
        { name: string; symbol: string }
      >;
      try {
        const tokenDetailsResponse = await getIndexerTokenDetails({
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
          `Failed to fetch token details - ${JSON.stringify(error)}`,
        );
        console.error(error);
      }
      setTokenDetails(_tokenDetails);
      setLoadingTokenDetails(false);
    }
    getTokenDetails();
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
