import React, { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { createPortal } from "react-dom";
import {
  Button,
  Card,
  Icon,
  Select,
  Textarea,
  Text,
} from "@stellar/design-system";
import { useTranslation, Trans } from "react-i18next";
import { Field, FieldProps, Formik, Form } from "formik";
import { object as YupObject, string as YupString } from "yup";

import {
  BlockAidScanAssetResult,
  BlockAidScanTxResult,
} from "@shared/api/types";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import {
  isBlockaidEnabled,
  reportAssetWarning,
  reportTransactionWarning,
  useBlockaidOverrideState,
  useShouldTreatAssetAsUnableToScan,
  useShouldTreatTxAsUnableToScan,
} from "popup/helpers/blockaid";
import { BlockaidWarning, SecurityLevel } from "popup/constants/blockaid";

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

export const DomainNotAllowedWarningMessage = ({
  domain,
}: {
  domain: string;
}) => {
  const { t } = useTranslation();
  return (
    <div className="ScanLabel ScanMiss">
      <div className="ScanLabel__Info">
        <div className="Icon">
          <Icon.InfoSquare className="WarningMessage__icon" />
        </div>
        <p className="Message">
          {t("{{domain}} is not currently connected to Freighter", { domain })}
        </p>
      </div>
    </div>
  );
};

export const BackupPhraseWarningMessage = () => {
  const { t } = useTranslation();

  return (
    <div className="WarningMessage__backup">
      <span className="WarningMessage__backup__description">
        {t("Keep your recovery phrase in a safe and secure place")}
      </span>
      <span className="WarningMessage__backup__description">
        {t(
          "Anyone who has access to this phrase has access to your account and to the funds in it, so save it in a safe and secure place.",
        )}
      </span>
      <div className="WarningMessage__backup__tips">
        <div className="WarningMessage__backup__tips__row">
          <div className="WarningMessage__backup__tips__icon">
            <Icon.Lock01 />
          </div>
          <span>
            {t(
              "Your recovery phrase gives you full access to your wallets and funds",
            )}
          </span>
        </div>
        <div className="WarningMessage__backup__tips__row">
          <div className="WarningMessage__backup__tips__icon">
            <Icon.EyeOff />
          </div>
          <span>{t("Don’t share this phrase with anyone")}</span>
        </div>
        <div className="WarningMessage__backup__tips__row">
          <div className="WarningMessage__backup__tips__icon">
            <Icon.XSquare />
          </div>
          <span>
            {t("Stellar Development Foundation will never ask for your phrase")}
          </span>
        </div>
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
        networkDetails,
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

  useEffect(() => {
    const modalRoot = document.getElementById("modal-root");
    if (modalRoot) {
      modalRoot.classList.add("BlockaidFeedback__modal-root");
    }
    return () => {
      if (modalRoot) {
        modalRoot.classList.remove("BlockaidFeedback__modal-root");
      }
    };
  }, []);

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
                          data-testid="blockaid-feedback-details"
                          {...field}
                          className="BlockaidFeedback__details"
                          fieldSize="md"
                          id="textarea"
                          label={t("Feedback")}
                          placeholder={t("Additional details")}
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

export const BlockaidByLine = ({
  handleClick,
  requestId,
  address,
}: {
  handleClick?: () => void;
  requestId?: string;
  address?: string;
}) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [isFeedbackActive, setIsFeedbackActive] = useState(false);

  return (
    <div className="BlockaidByLine">
      <div className="BlockaidByLine__left">
        <Text
          as="p"
          size="sm"
          weight="medium"
          className="BlockaidByLine__copyText"
        >
          {t("Powered by ")}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <g clipPath="url(#clip0_5576_70196)">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M9.76866 2.29851H0.130597V0H9.76866C11.5709 0 13.0336 1.46269 13.0336 3.26493C13.0336 5.06716 11.5709 6.52985 9.76866 6.52985H2.76866C2.50746 6.52985 2.27239 6.73881 2.27239 7C2.27239 7.26119 2.48134 7.47015 2.76866 7.47015H9.76866C11.5709 7.47015 13.0336 8.93284 13.0336 10.7351C13.0336 12.5373 11.5709 14 9.76866 14H0.130597V11.7015H9.76866C10.291 11.7015 10.7351 11.2575 10.7351 10.7351C10.7351 10.2127 10.291 9.76866 9.76866 9.76866H2.76866C1.25373 9.76866 0 8.54105 0 7C0 5.45896 1.25373 4.23134 2.76866 4.23134H9.76866C10.291 4.23134 10.7351 3.78731 10.7351 3.26493C10.7351 2.71642 10.291 2.29851 9.76866 2.29851Z"
                fill="#707070"
              />
            </g>
            <defs>
              <clipPath id="clip0_5576_70196">
                <rect width="13.0336" height="14" fill="white" />
              </clipPath>
            </defs>
          </svg>
          <span>{t("Blockaid")}</span>
        </Text>
      </div>
      {isBlockaidEnabled(networkDetails) ? (
        <Text
          as="span"
          size="sm"
          weight="medium"
          className="BlockaidByLine__feedback"
          onClick={() => {
            if (handleClick) {
              handleClick();
            }
            setIsFeedbackActive(true);
          }}
        >
          {t("Feedback?")}
        </Text>
      ) : null}
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

interface BlockAidAssetScanExpandedProps {
  scanResult: BlockAidScanAssetResult | null | undefined;
  onClose?: () => void;
}

interface BlockaidAssetDetailPaneProps {
  headerIconClass: string;
  headerIcon: React.ReactNode;
  title: string;
  subtitle: string;
  detailRows: React.ReactNode;
  onClose?: () => void;
}

const BlockaidAssetDetailPane = ({
  headerIconClass,
  headerIcon,
  title,
  subtitle,
  detailRows,
  onClose,
}: BlockaidAssetDetailPaneProps) => (
  <div className="BlockaidDetailsExpanded">
    <div className="BlockaidDetailsExpanded__Header">
      <div className={headerIconClass}>{headerIcon}</div>
      <div className="Close" onClick={onClose}>
        <Icon.X />
      </div>
    </div>
    <div className="BlockaidDetailsExpanded__Title">{title}</div>
    <div className="BlockaidDetailsExpanded__SubTitle">{subtitle}</div>
    <div className="BlockaidDetailsExpanded__Details">
      {detailRows}
      <BlockaidByLine address={""} />
    </div>
  </div>
);

export const BlockAidAssetScanExpanded = ({
  scanResult,
  onClose,
}: BlockAidAssetScanExpandedProps) => {
  const { t } = useTranslation();
  const shouldTreatAssetAsUnableToScan = useShouldTreatAssetAsUnableToScan();
  const blockaidOverrideState = useBlockaidOverrideState();

  // Override takes precedence — early returns before any scan-result guards
  if (blockaidOverrideState === SecurityLevel.MALICIOUS) {
    return (
      <BlockaidAssetDetailPane
        headerIconClass="WarningMarkError"
        headerIcon={<Icon.AlertOctagon />}
        title={t("Do not proceed")}
        subtitle={t(
          "This token has been flagged as malicious for the following reasons.",
        )}
        detailRows={
          <div className="BlockaidDetailsExpanded__DetailRow">
            <Icon.XCircle />
            <span>
              {t("This token was flagged as malicious (override active)")}
            </span>
          </div>
        }
        onClose={onClose}
      />
    );
  }

  if (blockaidOverrideState === SecurityLevel.SUSPICIOUS) {
    return (
      <BlockaidAssetDetailPane
        headerIconClass="WarningMark"
        headerIcon={<Icon.AlertTriangle />}
        title={t("Suspicious Request")}
        subtitle={t(
          "This token has been flagged as suspicious for the following reasons.",
        )}
        detailRows={
          <div className="BlockaidDetailsExpanded__DetailRow">
            <Icon.MinusCircle />
            <span>
              {t("This token was flagged as suspicious (override active)")}
            </span>
          </div>
        }
        onClose={onClose}
      />
    );
  }

  // No active override — use real scan result
  if (shouldTreatAssetAsUnableToScan(scanResult)) {
    return (
      <BlockaidAssetDetailPane
        headerIconClass="WarningMark"
        headerIcon={<Icon.AlertTriangle />}
        title={t("Proceed with caution")}
        subtitle={t("We were unable to scan this token for security threats")}
        detailRows={
          <div className="BlockaidDetailsExpanded__DetailRow">
            <Icon.MinusCircle />
            <span>{t("Unable to scan token")}</span>
          </div>
        }
        onClose={onClose}
      />
    );
  }

  const resultType = scanResult?.result_type;
  const isMalicious = resultType === "Malicious" || resultType === "Spam";
  const isSuspicious = resultType === "Warning" || resultType === "Spam";

  if (!isMalicious && !isSuspicious) {
    return null;
  }

  const features = scanResult?.features || [];
  const { title, description } = isMalicious
    ? {
        title: t("Do not proceed"),
        description: t(
          "This token has been flagged as malicious for the following reasons.",
        ),
      }
    : {
        title: t("Suspicious Request"),
        description: t(
          "This token has been flagged as suspicious for the following reasons.",
        ),
      };

  const warningType = isMalicious
    ? { class: "WarningMarkError", icon: <Icon.AlertOctagon /> }
    : { class: "WarningMark", icon: <Icon.AlertTriangle /> };

  const fallbackMessage = isMalicious
    ? t("This token was flagged as malicious")
    : t("This token was flagged as suspicious");

  const featureRows =
    features.length > 0 ? (
      features.map((feature) => (
        <div
          className="BlockaidDetailsExpanded__DetailRow"
          key={feature.feature_id}
        >
          <Icon.MinusCircle />
          <span>{feature.description}</span>
        </div>
      ))
    ) : (
      <div className="BlockaidDetailsExpanded__DetailRow">
        {isMalicious ? <Icon.XCircle /> : <Icon.MinusCircle />}
        <span>{fallbackMessage}</span>
      </div>
    );

  return (
    <BlockaidAssetDetailPane
      headerIconClass={warningType.class}
      headerIcon={warningType.icon}
      title={title}
      subtitle={description}
      detailRows={featureRows}
      onClose={onClose}
    />
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
      <p className="SslWarningText">
        <Trans
          domain={url}
          i18nKey="The website <1>{url}</1> does not use an SSL certificate."
          components={[<strong key="0">{url}</strong>]}
          values={{ url }}
        />
        {` ${t("For additional safety Freighter only works with websites that provide an SSL certificate by default.")} `}
        {`${t("You may enable connection to domains that do not use an SSL certificate in Settings &gt; Security &gt; Advanced settings.")} `}
      </p>
    </WarningMessage>
  );
};

export const MemoRequiredLabel = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation();
  return (
    <div
      className="ScanLabel ScanWarning"
      data-testid="memo-required-label"
      onClick={onClick}
    >
      <div className="ScanLabel__Info">
        <div className="Icon">
          <Icon.InfoSquare className="WarningMessage__icon" />
        </div>
        <p className="Message">{t("Memo required")}</p>
      </div>
      <div className="ScanLabel__Action">
        <Icon.ChevronRight />
      </div>
    </div>
  );
};

interface BlockAidScanExpandedProps {
  scanResult: BlockAidScanTxResult | BlockAidScanAssetResult | null | undefined;
  onClose?: () => void;
  isAssetScan?: boolean;
  // Additional friendly reasons to list alongside the scan's own (e.g. on a
  // swap, the source/destination token-scan features shown together with the
  // transaction-scan reasons, mirroring mobile — § batch4 task 3).
  extraWarnings?: BlockaidWarning[];
  // The verdict that drives the parent gate's malicious/suspicious styling for
  // those extra reasons (e.g. a swap token's merged SecurityLevel). Folded into
  // the pane's title/icon so the pane can never under-state severity relative
  // to the gate when a token is flagged via result_type but carries no
  // matching feature row (§ batch4 task 3).
  extraSeverityLevel?: SecurityLevel | null;
}

interface WarningInfo {
  warnings: Array<{ icon: React.ReactNode; text: string; isError?: boolean }>;
  isMalicious: boolean;
  isSuspicious: boolean;
}

/**
 * Checks if a scan result is malicious or suspicious based on its result_type
 * Handles both transaction and asset scan results
 */
const getScanResultSecurityFlags = (
  scanResult: BlockAidScanTxResult | BlockAidScanAssetResult | null | undefined,
): { isMalicious: boolean; isSuspicious: boolean } => {
  let isMalicious = false;
  let isSuspicious = false;

  if (!scanResult) {
    return { isMalicious, isSuspicious };
  }

  // Handle transaction scan results
  if (
    "validation" in scanResult &&
    scanResult.validation &&
    "result_type" in scanResult.validation
  ) {
    const resultType = scanResult.validation.result_type;
    if (resultType === "Malicious") {
      isMalicious = true;
    } else if (resultType === "Warning") {
      isSuspicious = true;
    }
  }
  // Handle asset scan results
  else if ("result_type" in scanResult) {
    const resultType = scanResult.result_type;
    if (resultType === "Malicious") {
      isMalicious = true;
    } else if (resultType === "Warning" || resultType === "Spam") {
      isSuspicious = true;
    }
  }

  return { isMalicious, isSuspicious };
};

/**
 * Gets warnings for transactions and assets by checking scan results
 */
const getScanWarnings = (
  scanResult: BlockAidScanTxResult | BlockAidScanAssetResult | null | undefined,
  isUnableToScan: boolean,
  t: (key: string) => string,
  blockaidOverrideState: string | null,
  isAssetScan: boolean,
): WarningInfo => {
  const warnings: Array<{
    icon: React.ReactNode;
    text: string;
    isError?: boolean;
  }> = [];

  // Override takes precedence over everything — check before null/unable-to-scan guards
  if (blockaidOverrideState === SecurityLevel.MALICIOUS) {
    warnings.push({
      icon: <Icon.XCircle />,
      text: isAssetScan
        ? t("This token was flagged as malicious (override active)")
        : t("This transaction was flagged as malicious (override active)"),
      isError: true,
    });
    return { warnings, isMalicious: true, isSuspicious: false };
  }

  if (blockaidOverrideState === SecurityLevel.SUSPICIOUS) {
    warnings.push({
      icon: <Icon.MinusCircle />,
      text: isAssetScan
        ? t("This token was flagged as suspicious (override active)")
        : t("This transaction was flagged as suspicious (override active)"),
      isError: false,
    });
    return { warnings, isMalicious: false, isSuspicious: true };
  }

  // If unable to scan, return unable to scan warning
  if (isUnableToScan) {
    warnings.push({
      icon: <Icon.MinusCircle />,
      text: isAssetScan
        ? t("Unable to scan token")
        : t("Unable to scan transaction"),
      isError: false,
    });
    return { warnings, isMalicious: false, isSuspicious: false };
  }

  // If no scan result, return empty warnings
  if (!scanResult) {
    return { warnings, isMalicious: false, isSuspicious: false };
  }

  // Get security flags from actual scan result
  const securityFlags = getScanResultSecurityFlags(scanResult);
  const isMalicious = securityFlags.isMalicious;
  const isSuspicious = securityFlags.isSuspicious;

  // Handle transaction scan results
  if ("simulation" in scanResult || "validation" in scanResult) {
    const txResult = scanResult as BlockAidScanTxResult;
    const { simulation, validation } = txResult;

    if (simulation && "error" in simulation) {
      warnings.push({
        icon: <Icon.MinusCircle />,
        text: simulation.error,
        isError: false,
      });
    }

    if (validation && "result_type" in validation) {
      // Prefer the per-feature friendly descriptions (same as the asset/
      // add-token path) over the raw top-level validation.description, which is
      // a developer string like "Token issuer <Address [type=ACCOUNT ...]> is
      // flagged as malicious" (§ batch3 task 3). Fall back to the top-level
      // description only when there are no flagged features.
      const validationFeatures =
        ("features" in validation && validation.features) || [];
      const flaggedFeatures = validationFeatures.filter(
        (feature) => feature.type === "Warning" || feature.type === "Malicious",
      );
      if (flaggedFeatures.length > 0) {
        flaggedFeatures.forEach((feature) => {
          warnings.push({
            icon:
              feature.type === "Malicious" ? (
                <Icon.XCircle />
              ) : (
                <Icon.MinusCircle />
              ),
            text: feature.description,
            isError: feature.type === "Malicious",
          });
        });
      } else if (validation.description) {
        warnings.push({
          icon: isMalicious ? <Icon.XCircle /> : <Icon.MinusCircle />,
          text: validation.description,
          isError: isMalicious,
        });
      }
    }
  } else {
    // Handle asset scan results
    const assetResult = scanResult as BlockAidScanAssetResult;
    const { features } = assetResult;
    const _features = features || [];

    _features.forEach((feature) => {
      warnings.push({
        icon: isMalicious ? <Icon.XCircle /> : <Icon.MinusCircle />,
        text: feature.description,
        isError: isMalicious,
      });
    });
  }

  return { warnings, isMalicious, isSuspicious };
};

export const BlockAidScanExpanded = ({
  scanResult,
  onClose,
  isAssetScan: isAssetScanProp,
  extraWarnings,
  extraSeverityLevel,
}: BlockAidScanExpandedProps) => {
  const { t } = useTranslation();
  const shouldTreatTxAsUnableToScan = useShouldTreatTxAsUnableToScan();
  const shouldTreatAssetAsUnableToScan = useShouldTreatAssetAsUnableToScan();
  const blockaidOverrideState = useBlockaidOverrideState();

  // Use the prop if provided, otherwise infer from scan result shape
  const isAssetScan =
    isAssetScanProp ??
    (scanResult != null &&
      !("simulation" in scanResult) &&
      !("validation" in scanResult));
  const isUnableToScan = isAssetScan
    ? shouldTreatAssetAsUnableToScan(scanResult as BlockAidScanAssetResult)
    : shouldTreatTxAsUnableToScan(scanResult as BlockAidScanTxResult);

  const hasActiveOverride =
    blockaidOverrideState === SecurityLevel.MALICIOUS ||
    blockaidOverrideState === SecurityLevel.SUSPICIOUS;

  if (
    !scanResult &&
    !isUnableToScan &&
    !hasActiveOverride &&
    !extraWarnings?.length
  ) {
    return null;
  }

  // Check override state (takes precedence, dev mode only)
  // Get warnings from scan result (handles both asset and transaction)
  const { warnings, isMalicious, isSuspicious } = getScanWarnings(
    scanResult,
    isUnableToScan,
    t,
    blockaidOverrideState,
    isAssetScan,
  );

  // Append any caller-supplied reasons (e.g. swap token-scan features), so the
  // pane lists the transaction-scan and token-scan reasons together like mobile
  // (§ batch4 task 3). Dedupe against the scan's own rows by text, and among the
  // extras by featureId, so the same reason never doubles up.
  const extraRows = (extraWarnings ?? [])
    .filter(
      (extra) =>
        !warnings.some((existing) => existing.text === extra.description),
    )
    .filter((extra, index, arr) => {
      const key = extra.featureId || extra.description;
      return (
        arr.findIndex(
          (other) => (other.featureId || other.description) === key,
        ) === index
      );
    })
    .map((extra) => ({
      icon: extra.isError ? <Icon.XCircle /> : <Icon.MinusCircle />,
      text: extra.description,
      isError: extra.isError,
    }));

  const allWarnings = [...warnings, ...extraRows];
  // Keep the pane title in lockstep with the gate. When the caller passes its
  // verdict (extraSeverityLevel) — e.g. a swap token's merged SecurityLevel —
  // trust it: this covers a token flagged via result_type with no matching
  // feature row, and avoids over-escalating an unable-to-scan token (which has
  // extra rows but is neither malicious nor suspicious). Fall back to the row
  // presence only when no verdict was supplied.
  const hasMaliciousExtra =
    extraRows.some((row) => row.isError) ||
    extraSeverityLevel === SecurityLevel.MALICIOUS;
  const mergedIsMalicious = isMalicious || hasMaliciousExtra;
  const mergedIsSuspicious =
    !mergedIsMalicious &&
    (isSuspicious ||
      extraSeverityLevel === SecurityLevel.SUSPICIOUS ||
      (extraSeverityLevel == null && extraRows.length > 0));

  let requestId = "";
  if (scanResult && "request_id" in scanResult && scanResult.request_id) {
    requestId = scanResult.request_id;
  }

  // Early return if no warnings
  if (allWarnings.length === 0) {
    return null;
  }

  const title = mergedIsMalicious
    ? t("Do not proceed")
    : mergedIsSuspicious
      ? t("Suspicious Request")
      : t("Proceed with caution");
  const subtitle = isAssetScan
    ? t("This token does not appear safe for the following reasons.")
    : t("This transaction does not appear safe for the following reasons.");
  const headerIcon = mergedIsMalicious ? (
    <div className="WarningMarkError">
      <Icon.AlertOctagon />
    </div>
  ) : (
    <div className="WarningMark">
      <Icon.AlertTriangle />
    </div>
  );

  return (
    <div className="BlockaidDetailsExpanded">
      <div className="BlockaidDetailsExpanded__Header">
        {headerIcon}
        <div
          className="Close"
          onClick={onClose}
          data-testid="blockaid-details-close"
        >
          <Icon.X />
        </div>
      </div>
      <div className="BlockaidDetailsExpanded__Title">{title}</div>
      <div className="BlockaidDetailsExpanded__SubTitle">{subtitle}</div>
      <div className="BlockaidDetailsExpanded__Details">
        {allWarnings.map((warning, index) => (
          <div
            key={`${warning.text}-${index}`}
            className={
              warning.isError
                ? "BlockaidDetailsExpanded__DetailRowError"
                : "BlockaidDetailsExpanded__DetailRow"
            }
          >
            {warning.icon}
            <span>{warning.text}</span>
          </div>
        ))}
        <BlockaidByLine address={""} requestId={requestId} />
      </div>
    </div>
  );
};
