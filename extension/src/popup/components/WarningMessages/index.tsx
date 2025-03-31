import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import {
  Button,
  Card,
  Icon,
  Loader,
  Select,
  Textarea,
  Text,
} from "@stellar/design-system";
import { useTranslation, Trans } from "react-i18next";
import { Field, FieldProps, Formik, Form } from "formik";
import { object as YupObject, string as YupString } from "yup";

import { POPUP_HEIGHT } from "constants/dimensions";
import {
  Account,
  Asset,
  Operation,
  Horizon,
  TransactionBuilder,
} from "stellar-sdk";
import { captureException } from "@sentry/browser";

import {
  ActionStatus,
  AssetIcons,
  BlockAidScanAssetResult,
  BlockAidScanTxResult,
} from "@shared/api/types";
import { getTokenDetails } from "@shared/api/internal";
import { TokenArgsDisplay } from "@shared/api/helpers/soroban";

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
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { emitMetric } from "helpers/metrics";
import IconShieldCross from "popup/assets/icon-shield-cross.svg";
import IconWarning from "popup/assets/icon-warning.svg";
import IconUnverified from "popup/assets/icon-unverified.svg";
import IconNewAsset from "popup/assets/icon-new-asset.svg";
import IconShieldBlockaid from "popup/assets/icon-shield-blockaid.svg";
import IconWarningBlockaid from "popup/assets/icon-warning-blockaid.svg";
import IconWarningBlockaidYellow from "popup/assets/icon-warning-blockaid-yellow.svg";
import { getVerifiedTokens } from "popup/helpers/searchAsset";
import { AccountBalances } from "helpers/hooks/useGetBalances";

import {
  isAssetSuspicious,
  isBlockaidWarning,
  reportAssetWarning,
  reportTransactionWarning,
} from "popup/helpers/blockaid";
import { CopyValue } from "../CopyValue";
import { Notification as NotificationV2 } from "../Notification";

import "./styles.scss";

export enum WarningMessageVariant {
  default = "",
  highAlert = "high-alert",
  warning = "warning",
}

interface WarningMessageHeaderProps {
  header: string;
  icon: React.ReactNode;
  variant: WarningMessageVariant;
  children?: React.ReactNode;
}

const WarningMessageHeader = ({
  header,
  icon,
  variant,
  children,
}: WarningMessageHeaderProps) => (
  <div
    className={`WarningMessage__infoBlock WarningMessage__infoBlock--${variant}`}
    data-testid="WarningMessage"
  >
    <div className="WarningMessage__header">
      {icon}
      <div>{header}</div>
      {children}
    </div>
  </div>
);

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
    <WarningMessageHeader
      header={header}
      icon={
        variant ? (
          <Icon.InfoOctagon className="WarningMessage__icon" />
        ) : (
          <Icon.InfoCircle className="WarningMessage__default-icon" />
        )
      }
      variant={variant}
    >
      {headerChildren}
    </WarningMessageHeader>
  );

  return isWarningActive ? (
    createPortal(
      <div className="WarningMessage--active">
        <WarningInfoBlock />
        <div className="WarningMessage__children-wrapper">{children}</div>
        <Button
          size="md"
          variant="tertiary"
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
  isMemoRequired: boolean;
  isSuspicious: boolean;
  blockaidData: BlockAidScanAssetResult;
}

export const FlaggedWarningMessage = ({
  isMemoRequired,
  isSuspicious,
  blockaidData,
}: FlaggedWarningMessageProps) => (
  <>
    {isSuspicious ? (
      <BlockaidAssetScanLabel blockaidData={blockaidData} />
    ) : null}
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
          <Icon.InfoOctagon className="WarningMessage__icon" />
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

interface BlockaidFeedbackFormValues {
  details: string;
  transactionIssue?: string;
}

const BlockaidFeedbackFormSchema = YupObject().shape({
  details: YupString().required(),
});

interface BlockaidFeedbackFormProps {
  address?: string;
  requestId?: string;
  setIsFeedbackActive: (isActive: boolean) => void;
}

const BlockaidFeedbackForm = ({
  address,
  requestId,
  setIsFeedbackActive,
}: BlockaidFeedbackFormProps) => {
  const { t } = useTranslation();
  const feedbackRef = useRef<HTMLDivElement>(null);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  const handleSubmit = async (values: BlockaidFeedbackFormValues) => {
    if (requestId && values.transactionIssue) {
      await reportTransactionWarning({
        details: values.details,
        requestId,
        event: values.transactionIssue,
      });
    } else if (address) {
      await reportAssetWarning({
        address,
        details: values.details,
        networkDetails,
      });
    }

    setIsFeedbackActive(false);
  };

  const initialValues: BlockaidFeedbackFormValues = {
    details: "",
    transactionIssue: "should_be_benign",
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        feedbackRef.current &&
        !feedbackRef.current.contains(event.target as Node)
      ) {
        setIsFeedbackActive(false);
      }
    };

    document.addEventListener("click", handleClickOutside, true);
    return () => {
      document.removeEventListener("click", handleClickOutside, true);
    };
  }, [setIsFeedbackActive]);

  return (
    <>
      <div className="BlockaidFeedback__background">
        <LoadingBackground isActive isOpaque />
      </div>
      <div className="BlockaidFeedback" ref={feedbackRef}>
        <div className="BlockaidFeedback__modal">
          <Card>
            <Formik
              initialValues={initialValues}
              onSubmit={handleSubmit}
              validationSchema={BlockaidFeedbackFormSchema}
            >
              {({ dirty, isValid, isSubmitting }) => (
                <Form>
                  <div className="BlockaidFeedback__modal__content">
                    <Text as="h1" size="md" weight="medium">
                      {t("Leave feedback about Blockaid warnings and messages")}
                    </Text>
                    {requestId ? (
                      <Field name="transactionIssue">
                        {({ field }: FieldProps) => (
                          <Select
                            {...field}
                            fieldSize="md"
                            id="select"
                            label={t("Transaction")}
                          >
                            <option value="should_be_benign">
                              {t("Should be benign")}
                            </option>
                            <option value="wrong_simulation_result">
                              {t("Wrong simulation result")}
                            </option>
                          </Select>
                        )}
                      </Field>
                    ) : null}

                    <Field name="details">
                      {({ field }: FieldProps) => (
                        <Textarea
                          {...field}
                          className="BlockaidFeedback__details"
                          fieldSize="md"
                          id="textarea"
                          label="Feedback"
                          placeholder="Additional details"
                        />
                      )}
                    </Field>
                  </div>
                  <div className="BlockaidFeedback__modal__footer">
                    <Button
                      icon={<Icon.LinkExternal01 />}
                      iconPosition="right"
                      size="md"
                      variant="tertiary"
                      isFullWidth
                    >
                      {t("Learn more")}
                    </Button>
                    <Button
                      size="md"
                      variant="secondary"
                      isFullWidth
                      disabled={!(dirty && isValid)}
                      isLoading={isSubmitting}
                    >
                      {t("Submit")}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </Card>
        </div>
      </div>
    </>
  );
};

const BlockaidByLine = ({
  hasArrow = false,
  handleClick,
  requestId,
  address,
}: {
  hasArrow?: boolean;
  handleClick?: () => void;
  requestId?: string;
  address?: string;
}) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [isFeedbackActive, setIsFeedbackActive] = useState(false);

  return (
    <div className="BlockaidByLine">
      <div className="BlockaidByLine__copy">
        <img src={IconShieldBlockaid} alt="icon shield blockaid" />
        <Text as="p" size="xs" weight="medium">
          {t("Powered by ")}
          <a rel="noreferrer" href="https://www.blockaid.io/" target="_blank">
            Blockaid
          </a>
        </Text>
      </div>
      {isMainnet(networkDetails) || isTestnet(networkDetails) ? (
        <div className="BlockaidByLine__feedback">
          <div
            className="BlockaidByLine__feedback__button"
            onClick={() => {
              setIsFeedbackActive(true);
            }}
          >
            <Text as="p" size="xs" weight="medium">
              {t("Feedback?")}
            </Text>
          </div>
        </div>
      ) : null}

      {hasArrow && (
        <div
          className="BlockaidByLine__arrow"
          data-testid={`BlockaidByLine__arrow__${address ? "asset" : "tx"}`}
          onClick={handleClick}
        >
          <Icon.ChevronRight />
        </div>
      )}
      {isFeedbackActive &&
        createPortal(
          <BlockaidFeedbackForm
            requestId={requestId}
            setIsFeedbackActive={setIsFeedbackActive}
            address={address}
          />,
          document.querySelector("#modal-root")!,
        )}
    </div>
  );
};

interface BlockaidAssetWarningProps {
  blockaidData: BlockAidScanAssetResult;
}

export const BlockaidAssetWarning = ({
  blockaidData,
}: BlockaidAssetWarningProps) => {
  const { t } = useTranslation();
  const isWarning = isBlockaidWarning(blockaidData.result_type);

  return (
    <div
      className={`ScamAssetWarning__box ${
        isWarning ? "ScamAssetWarning__box--isWarning" : ""
      }`}
      data-testid="ScamAssetWarning__box"
    >
      <div className="ScamAssetWarning__box__content">
        <div className="Icon">
          <img
            className="ScamAssetWarning__box__icon"
            src={isWarning ? IconWarningBlockaidYellow : IconWarningBlockaid}
            alt="icon warning blockaid"
          />
        </div>
        <div>
          <div className="ScamAssetWarning__description">
            {t(
              `This token was flagged as ${blockaidData.result_type} by Blockaid. Interacting with this token may result in loss of funds and is not recommended for the following reasons`,
            )}
            :
            <ul className="ScamAssetWarning__list">
              {blockaidData.features &&
                blockaidData.features.map((f) => (
                  <li key={f.feature_id}>{f.description}</li>
                ))}
            </ul>
          </div>
        </div>
      </div>
      <BlockaidByLine address={blockaidData.address} />
    </div>
  );
};

export const ScamAssetWarning = ({
  pillType,
  isSendWarning = false,
  domain,
  code,
  issuer,
  image,
  onClose,

  onContinue = () => {},
  blockaidData,
  assetIcons,
  balances,
}: {
  pillType: "Connection" | "Trustline" | "Transaction";
  isSendWarning?: boolean;
  domain: string;
  code: string;
  issuer: string;
  image: string;
  onClose: () => void;
  onContinue?: () => void;
  blockaidData: BlockAidScanAssetResult;
  assetIcons: AssetIcons;
  balances: AccountBalances;
}) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const warningRef = useRef<HTMLDivElement>(null);
  const { recommendedFee } = useNetworkFees();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const { submitStatus } = useSelector(transactionSubmissionSelector);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);
  const navigate = useNavigate();

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
          navigateTo(ROUTES.account, navigate);
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
      <TrustlineError handleClose={() => closeOverlay()} balances={balances} />,
      document.querySelector("#modal-root")!,
    )
  ) : (
    <div
      className={`ScamAssetWarning ${
        pillType === "Trustline" ? "ScamAssetWarning--isTrustline" : ""
      }`}
      data-testid="ScamAssetWarning"
    >
      <View.Content>
        <ModalInfo
          code={code}
          issuer={issuer}
          domain={domain}
          image={image}
          assetIcons={assetIcons}
          variant={isAssetSuspicious(blockaidData) ? "malicious" : "default"}
          asset={code}
          pillType={pillType}
        >
          <div className="ScamAssetWarning__wrapper" ref={warningRef}>
            <div>
              <BlockaidAssetWarning blockaidData={blockaidData} />
            </div>
            <div className="ScamAssetWarning__btns">
              {!isSendWarning && (
                <Button
                  data-testid="ScamAsset__add-asset"
                  size="md"
                  isFullWidth
                  onClick={handleSubmit}
                  type="button"
                  variant="error"
                  isLoading={
                    isSubmitting || submitStatus === ActionStatus.PENDING
                  }
                >
                  {t("Add anyway")}
                </Button>
              )}
              <Button
                size="md"
                isFullWidth
                variant="secondary"
                type="button"
                onClick={closeOverlay}
              >
                {t("Cancel")}
              </Button>
              {isSendWarning && (
                <Button
                  data-testid="ScamAsset__send"
                  size="md"
                  isFullWidth
                  onClick={onContinue}
                  type="button"
                  variant="error"
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
  balances,
}: {
  domain: string;
  code: string;
  issuer: string;
  image: string;
  newAssetFlags: NewAssetFlags;
  onClose: () => void;
  balances: AccountBalances;
}) => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const warningRef = useRef<HTMLDivElement>(null);
  const { recommendedFee } = useNetworkFees();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const publicKey = useSelector(publicKeySelector);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isHardwareWallet = !!useSelector(hardwareWalletTypeSelector);
  const navigate = useNavigate();

  const [isTrustlineErrorShowing, setIsTrustlineErrorShowing] = useState(false);

  const { isRevocable, isInvalidDomain } = newAssetFlags;

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
          navigateTo(ROUTES.account, navigate);
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
      <TrustlineError handleClose={() => closeOverlay()} balances={balances} />,
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

export const WarningModal = (props: { description: string }) => {
  const { t } = useTranslation();

  return (
    <div
      className="WarningModal__box WarningModal__box--isWarning"
      data-testid="WarningModal"
    >
      <div className="WarningModal__box__content">
        <div className="Icon">
          <img
            className="WarningModal__box__icon"
            src={IconWarning}
            alt="icon warning"
          />
        </div>
        <div className="WarningModal__alert">
          <div className="WarningModal__description">
            {t(props.description)}
          </div>
        </div>
      </div>
    </div>
  );
};

export const UnverifiedTokenNotification = () => {
  return (
    <WarningModal description="Before you add this asset, please double-check its information and characteristics. This can help you identify fraudulent assets." />
  );
};

export const TokenWarning = ({
  domain,
  code,
  onClose,
  isVerifiedToken,
  verifiedLists = [],
  handleAddToken,
  isCustomToken,
}: {
  domain: string;
  code: string;
  onClose: () => void;
  isVerifiedToken: boolean;
  verifiedLists?: string[];
  handleAddToken: null | (() => Promise<void>);
  isCustomToken: boolean;
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
            <div className="TokenWarning__body">
              <div className="TokenWarning__heading">
                <div className="TokenWarning__icon">
                  <SorobanTokenIcon noMargin />
                </div>
                <div className="TokenWarning__code">{code}</div>
                <div className="TokenWarning__domain">{domain}</div>
                <div className="TokenWarning__description">
                  <div className="TokenWarning__description__icon">
                    <Icon.User02 />
                  </div>
                  <div
                    className="TokenWarning__description__text"
                    data-testid="DescriptionLabel"
                  >
                    {isCustomToken ? t("Add Asset") : t("Add Asset Trustline")}
                  </div>
                </div>
              </div>
              <div data-testid="token-warning-notification">
                {isVerifiedToken ? (
                  <NotificationV2
                    description={t(
                      `This asset is part of the asset list(s): "${verifiedLists.join(
                        ", ",
                      )}". Freighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.`,
                    )}
                    type="info"
                  />
                ) : (
                  <NotificationV2
                    description={t(
                      "This asset is not part of an asset list. Please, double-check the asset you’re interacting with and proceed with care. Freighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.",
                    )}
                    type="warning"
                  />
                )}
              </div>

              <div className="TokenWarning__flags">
                <div className="TokenWarning__flags__info">
                  {t("Asset Info")}
                </div>

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
            </div>

            <div className="TokenWarning__bottom-content">
              <div className="ScamAssetWarning__btns">
                <Button
                  size="md"
                  isFullWidth
                  variant="tertiary"
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
                  variant="secondary"
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
      variant={WarningMessageVariant.warning}
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
      {}
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

export const BlockAidMaliciousLabel = () => {
  const { t } = useTranslation();
  return (
    <div
      className="ScanLabel ScanMalicious"
      data-testid="blockaid-malicious-label"
    >
      <div className="Icon">
        <Icon.InfoOctagon className="WarningMessage__icon" />
      </div>
      <p className="Message">{t("This site was flagged as malicious")}</p>
    </div>
  );
};

export const BlockAidMissLabel = () => {
  const { t } = useTranslation();
  return (
    <div className="ScanLabel ScanMiss" data-testid="blockaid-miss-label">
      <div className="Icon">
        <Icon.InfoOctagon className="WarningMessage__icon" />
      </div>
      <p className="Message">
        {t("Unable to scan site for malicious behavior")}
      </p>
    </div>
  );
};

export const BlockAidSiteScanLabel = ({
  status,
  isMalicious,
}: {
  status: "hit" | "miss";
  isMalicious: boolean;
}) => {
  if (status === "miss") {
    return <BlockAidMissLabel />;
  }

  if (isMalicious) {
    return <BlockAidMaliciousLabel />;
  }

  // benign case should not show anything for now
  return <React.Fragment />;
};

export const BlockaidTxScanLabel = ({
  scanResult,
}: {
  scanResult: BlockAidScanTxResult;
}) => {
  const { t } = useTranslation();
  const { simulation, validation, request_id: requestId } = scanResult;

  if (simulation && "error" in simulation) {
    const header = t("This transaction is expected to fail");
    return (
      <BlockaidWarningModal
        header={header}
        description={[simulation.error]}
        isWarning
        requestId={requestId}
      />
    );
  }

  let message = null;
  if (validation && "result_type" in validation) {
    switch (validation.result_type) {
      case "Malicious": {
        message = {
          header: t("This transaction was flagged as malicious"),
          variant: WarningMessageVariant.highAlert,
          message: validation.description,
        };

        return (
          <BlockaidWarningModal
            header={message.header}
            description={[message.message]}
            isWarning={false}
            requestId={requestId}
          />
        );
      }

      case "Warning": {
        message = {
          header: "This transaction was flagged as suspicious",
          variant: WarningMessageVariant.warning,
          message: validation.description,
        };

        return (
          <BlockaidWarningModal
            header={message.header}
            description={[message.message]}
            isWarning
          />
        );
      }

      case "Benign":
      default:
    }
  }
  return <></>;
};

export const BlockaidAssetScanLabel = ({
  blockaidData,
}: {
  blockaidData: BlockAidScanAssetResult;
}) => {
  const isWarning = isBlockaidWarning(blockaidData.result_type);

  return (
    <BlockaidWarningModal
      header={`This asset was flagged as ${blockaidData.result_type.toLowerCase()}`}
      description={blockaidData.features?.map((f) => f.description) || []}
      isWarning={isWarning}
      address={blockaidData.address}
    />
  );
};

interface BlockaidWarningModalProps {
  header: string;
  description: string[];
  handleCloseClick?: () => void;
  isActive?: boolean;
  isWarning: boolean;
  requestId?: string;
  address?: string;
}

export const BlockaidWarningModal = ({
  handleCloseClick,
  header,
  description,
  isActive = false,
  isWarning,
  requestId,
  address,
}: BlockaidWarningModalProps) => {
  const { t } = useTranslation();
  const [isModalActive, setIsModalActive] = useState(isActive);
  const isAsset = !!address;

  const WarningInfoBlock = ({ hasArrow = false }: { hasArrow?: boolean }) => (
    <div
      className={`ScamAssetWarning__box ${
        isWarning ? "ScamAssetWarning__box--isWarning" : ""
      }`}
      data-testid="BlockaidWarningModal__alert"
    >
      <div className="ScamAssetWarning__box__content">
        <div className="Icon">
          <img
            className="ScamAssetWarning__box__icon"
            src={isWarning ? IconWarningBlockaidYellow : IconWarningBlockaid}
            alt="icon warning blockaid"
          />
        </div>
        <div className="ScamAssetWarning__alert">
          <div className="ScamAssetWarning__description">{header}</div>
          <BlockaidByLine
            hasArrow={hasArrow}
            handleClick={() => setIsModalActive(true)}
            requestId={requestId}
            address={address}
          />
        </div>
      </div>
    </div>
  );

  const truncatedDescription = (desc: string) => {
    const arr = desc.split(" ");

    return arr.map((word) => {
      if (word.length > 30) {
        return (
          <>
            <CopyValue
              value={word}
              displayValue={`${word.slice(0, 4)}...${word.slice(-4)}`}
            />{" "}
          </>
        );
      }

      return <span key={word}>{word} </span>;
    });
  };

  return isModalActive ? (
    <>
      <WarningInfoBlock hasArrow />
      {createPortal(
        <div
          className="BlockaidWarningModal"
          data-testid={`BlockaidWarningModal__${isAsset ? "asset" : "tx"}`}
        >
          <LoadingBackground isActive />
          <div className="BlockaidWarningModal__modal">
            <Card>
              <div
                className={`BlockaidWarningModal__modal__icon ${
                  isWarning
                    ? "BlockaidWarningModal__modal__icon--isWarning"
                    : ""
                }`}
              >
                <img
                  className="BlockaidWarningModal__modal__image"
                  src={
                    isWarning ? IconWarningBlockaidYellow : IconWarningBlockaid
                  }
                  alt="icon warning blockaid"
                />
              </div>

              <div className="BlockaidWarningModal__modal__title">{header}</div>
              <div className="BlockaidWarningModal__modal__description">
                {t(
                  `${header} by Blockaid. Interacting with this ${
                    isAsset ? "token" : "transaction"
                  } may result in loss of funds and is not recommended for the following reasons`,
                )}
                :
                <ul className="ScamAssetWarning__list">
                  {description.map((d) => (
                    <li key={d.replace(" ", "-")}>{truncatedDescription(d)}</li>
                  ))}
                </ul>
              </div>
              <div className="BlockaidWarningModal__modal__byline">
                <BlockaidByLine requestId={requestId} address={address} />
              </div>

              <Button
                data-testid="BlockaidWarningModal__button"
                size="md"
                variant="tertiary"
                isFullWidth
                type="button"
                onClick={() =>
                  handleCloseClick
                    ? handleCloseClick()
                    : setIsModalActive(false)
                }
              >
                {t("Got it")}
              </Button>
            </Card>
          </div>
        </div>,
        document.querySelector("#modal-root")!,
      )}
    </>
  ) : (
    <div
      className="WarningMessage__activate-button"
      data-testid={`BlockaidWarningModal__button__${isAsset ? "asset" : "tx"}`}
    >
      <WarningInfoBlock hasArrow />
    </div>
  );
};
