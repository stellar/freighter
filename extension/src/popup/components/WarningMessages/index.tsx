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

import { isMainnet, isTestnet } from "helpers/stellar";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { getBlockaidOverrideState } from "@shared/api/internal";
import { LoadingBackground } from "popup/basics/LoadingBackground";
import {
  reportAssetWarning,
  reportTransactionWarning,
  useShouldTreatAssetAsUnableToScan,
  useShouldTreatTxAsUnableToScan,
  useIsTxSuspicious,
} from "popup/helpers/blockaid";
import { SecurityLevel } from "popup/constants/blockaid";

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

export const AssetListWarning = ({
  isVerified,
  onClick,
}: {
  isVerified: boolean;
  onClick: () => void;
}) => {
  const { t } = useTranslation();
  const title = isVerified ? t("On your lists") : t("Not on your lists");
  return (
    <div className="ScanLabel ScanMiss" onClick={onClick}>
      <div className="ScanLabel__Info">
        <div className="Icon">
          <Icon.InfoSquare className="WarningMessage__icon" />
        </div>
        <p className="Message">{title}</p>
      </div>
      <div className="ScanLabel__Action">
        <Icon.ChevronRight />
      </div>
    </div>
  );
};

interface AssetListWarningExpandedProps {
  isVerified: boolean;
  onClose?: () => void;
}

export const AssetListWarningExpanded = ({
  isVerified,
  onClose,
}: AssetListWarningExpandedProps) => {
  const { t } = useTranslation();
  const title = isVerified
    ? t("This asset is on your lists")
    : t("This asset is not on your lists");

  return (
    <div className="BlockaidDetailsExpanded">
      <div className="BlockaidDetailsExpanded__Header">
        <div className="WarningMark">
          <Icon.AlertTriangle />
        </div>
        <div className="Close" onClick={onClose}>
          <Icon.X />
        </div>
      </div>
      <div className="BlockaidDetailsExpanded__Title">{title}</div>
      <div className="BlockaidDetailsExpanded__SubTitle">
        {`${t("Freighter uses asset lists to check assets you interact with.")} ${t("You can define your own assets lists in Settings.")}`}
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
      <div className="BlockaidByLine__copy">
        <Text as="p" size="sm" weight="medium">
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
      {isMainnet(networkDetails) || isTestnet(networkDetails) ? (
        <div className="BlockaidByLine__feedback">
          <div
            className="BlockaidByLine__feedback__button"
            onClick={() => {
              if (handleClick) {
                handleClick();
              }
              setIsFeedbackActive(true);
            }}
          >
            <Text as="p" size="sm" weight="medium">
              {t("Feedback?")}
            </Text>
          </div>
        </div>
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

interface BlockaidAssetWarningProps {
  blockaidData: BlockAidScanAssetResult | null | undefined;
  onClick: () => void;
  messageKey?: string; // Optional translation key for custom message
}

export const BlockaidAssetWarning = ({
  blockaidData,
  onClick,
  messageKey = "Unable to scan transaction",
}: BlockaidAssetWarningProps) => {
  const { t } = useTranslation();
  const shouldTreatAsUnableToScan = useShouldTreatAssetAsUnableToScan();

  // Handle unable to scan state
  if (shouldTreatAsUnableToScan(blockaidData)) {
    return (
      <div
        className="ScanLabel ScanMiss"
        data-testid="blockaid-unable-to-scan-label"
        onClick={onClick}
      >
        <div className="ScanLabel__Info">
          <div className="Icon">
            <Icon.InfoSquare className="WarningMessage__icon" />
          </div>
          <p className="Message">{t(messageKey)}</p>
        </div>
        <div className="ScanLabel__Action">
          <Icon.ChevronRight />
        </div>
      </div>
    );
  }

  if (!blockaidData || !blockaidData.result_type) {
    return null;
  }

  const renderHeader = (
    result_type: BlockAidScanAssetResult["result_type"],
  ) => {
    switch (result_type) {
      case "Spam": {
        return t("This asset was flagged as spam");
      }

      case "Malicious": {
        return t("This asset was flagged as malicious");
      }

      default: {
        return t("This asset was flagged as suspicious");
      }
    }
  };

  const scanType =
    blockaidData.result_type === "Spam" ||
    blockaidData.result_type === "Warning"
      ? "ScanMiss"
      : "ScanMalicious";

  return (
    <div
      className={`ScanLabel ${scanType}`}
      data-testid="blockaid-miss-label"
      onClick={onClick}
    >
      <div className="ScanLabel__Info">
        <div className="Icon">
          <Icon.InfoSquare className="WarningMessage__icon" />
        </div>
        <p className="Message">{renderHeader(blockaidData.result_type)}</p>
      </div>
      <div className="ScanLabel__Action">
        <Icon.ChevronRight />
      </div>
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

export const BlockAidMaliciousLabel = ({
  onClick,
}: {
  onClick: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <div
      className="ScanLabel ScanMalicious"
      data-testid="blockaid-malicious-label"
      onClick={onClick}
    >
      <div className="ScanLabel__Info">
        <div className="Icon">
          <Icon.InfoSquare className="WarningMessage__icon" />
        </div>
        <p className="Message">{t("This site was flagged as malicious")}</p>
      </div>
      <div className="ScanLabel__Action">
        <Icon.ChevronRight />
      </div>
    </div>
  );
};

export const BlockAidMissLabel = () => {
  const { t } = useTranslation();
  return (
    <div className="ScanLabel ScanMiss" data-testid="blockaid-miss-label">
      <div className="ScanLabel__Info">
        <div className="Icon">
          <Icon.InfoSquare className="WarningMessage__icon" />
        </div>
        <p className="Message">
          {t("Unable to scan site for malicious behavior")}
        </p>
      </div>
    </div>
  );
};

export const BlockAidSiteScanLabel = ({
  status,
  isMalicious,
  onClick,
}: {
  status: "hit" | "miss";
  isMalicious: boolean;
  onClick: () => void;
}) => {
  if (status === "miss") {
    return <BlockAidMissLabel />;
  }

  if (isMalicious) {
    return <BlockAidMaliciousLabel onClick={onClick} />;
  }

  // benign case should not show anything for now
  return <React.Fragment />;
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

export const BlockaidTxScanLabel = ({
  scanResult,
  onClick,
}: {
  scanResult: BlockAidScanTxResult | null | undefined;
  onClick: () => void;
}) => {
  const { t } = useTranslation();
  const shouldTreatAsUnableToScan = useShouldTreatTxAsUnableToScan();
  const isTxSuspiciousCheck = useIsTxSuspicious();
  const [blockaidState, setBlockaidState] = useState<string | null>(null);
  const isDev = process.env.DEV_EXTENSION === "true" || !process.env.PRODUCTION;

  useEffect(() => {
    if (!isDev) {
      return;
    }
    getBlockaidOverrideState()
      .then(setBlockaidState)
      .catch(() => setBlockaidState(null));
  }, [isDev]);

  // Extract complex conditions for readability
  const isUnableToScan = shouldTreatAsUnableToScan(scanResult);
  const hasScanResult = !!scanResult;
  const isMalicious =
    isDev &&
    blockaidState === SecurityLevel.MALICIOUS &&
    isTxSuspiciousCheck(scanResult);
  const isSuspicious =
    isDev &&
    blockaidState === SecurityLevel.SUSPICIOUS &&
    isTxSuspiciousCheck(scanResult);

  // Handle unable to scan state
  if (isUnableToScan) {
    return (
      <div
        className="ScanLabel ScanMiss"
        data-testid="blockaid-unable-to-scan-label"
        onClick={onClick}
      >
        <div className="ScanLabel__Info">
          <div className="Icon">
            <Icon.InfoSquare className="WarningMessage__icon" />
          </div>
          <p className="Message">{t("Proceed with caution")}</p>
        </div>
        <div className="ScanLabel__Action">
          <Icon.ChevronRight />
        </div>
      </div>
    );
  }

  // Early return if scanResult is null/undefined and not unable to scan
  if (!hasScanResult && !isUnableToScan) {
    return null;
  }

  // Check if transaction is malicious
  if (isMalicious) {
    return (
      <div
        className="ScanLabel ScanMalicious"
        data-testid="blockaid-malicious-label"
        onClick={onClick}
      >
        <div className="ScanLabel__Info">
          <div className="Icon">
            <Icon.InfoSquare className="WarningMessage__icon" />
          </div>
          <p className="Message">
            {t("This transaction was flagged as malicious")}
          </p>
        </div>
        <div className="ScanLabel__Action">
          <Icon.ChevronRight />
        </div>
      </div>
    );
  }

  // Check if transaction is suspicious
  if (isSuspicious) {
    return (
      <div
        className="ScanLabel ScanMiss"
        data-testid="blockaid-miss-label"
        onClick={onClick}
      >
        <div className="ScanLabel__Info">
          <div className="Icon">
            <Icon.InfoSquare className="WarningMessage__icon" />
          </div>
          <p className="Message">
            {t("This transaction was flagged as suspicious")}
          </p>
        </div>
        <div className="ScanLabel__Action">
          <Icon.ChevronRight />
        </div>
      </div>
    );
  }

  if (!scanResult) {
    return null;
  }

  const { simulation, validation } = scanResult;

  if (simulation && "error" in simulation) {
    const header = t("This transaction is expected to fail");
    return (
      <div
        className="ScanLabel ScanMiss"
        data-testid="blockaid-miss-label"
        onClick={onClick}
      >
        <div className="ScanLabel__Info">
          <div className="Icon">
            <Icon.InfoSquare className="WarningMessage__icon" />
          </div>
          <p className="Message">{header}</p>
        </div>
        <div className="ScanLabel__Action">
          <Icon.ChevronRight />
        </div>
      </div>
    );
  }

  if (validation && "result_type" in validation) {
    switch (validation.result_type) {
      case "Malicious": {
        return (
          <div
            className="ScanLabel ScanMalicious"
            data-testid="blockaid-malicious-label"
            onClick={onClick}
          >
            <div className="ScanLabel__Info">
              <div className="Icon">
                <Icon.InfoSquare className="WarningMessage__icon" />
              </div>
              <p className="Message">
                {t("This transaction was flagged as malicious")}
              </p>
            </div>
            <div className="ScanLabel__Action">
              <Icon.ChevronRight />
            </div>
          </div>
        );
      }

      case "Warning": {
        return (
          <div
            className="ScanLabel ScanMiss"
            data-testid="blockaid-miss-label"
            onClick={onClick}
          >
            <div className="ScanLabel__Info">
              <div className="Icon">
                <Icon.InfoSquare className="WarningMessage__icon" />
              </div>
              <p className="Message">
                {t("This transaction was flagged as suspicious")}
              </p>
            </div>
            <div className="ScanLabel__Action">
              <Icon.ChevronRight />
            </div>
          </div>
        );
      }

      case "Benign":
      default:
    }
  }
  return <></>;
};

interface BlockAidTxScanExpandedProps {
  scanResult: BlockAidScanTxResult | BlockAidScanAssetResult | null | undefined;
  onClose?: () => void;
}

interface WarningInfo {
  warnings: Array<{ icon: React.ReactNode; text: string }>;
  isMalicious: boolean;
  isSuspicious: boolean;
}

/**
 * Gets warnings for transactions and assets by checking scan results
 */
const getScanWarnings = (
  scanResult: BlockAidScanTxResult | BlockAidScanAssetResult | null | undefined,
  isUnableToScan: boolean,
  t: (key: string) => string,
): WarningInfo => {
  const warnings: Array<{ icon: React.ReactNode; text: string }> = [];
  let isMalicious = false;
  let isSuspicious = false;

  // If unable to scan, return unable to scan warning
  if (isUnableToScan) {
    warnings.push({
      icon: <Icon.MinusCircle />,
      text: t("Unable to scan transaction"),
    });
    return { warnings, isMalicious, isSuspicious };
  }

  // If no scan result, return empty warnings
  if (!scanResult) {
    return { warnings, isMalicious, isSuspicious };
  }

  // Handle transaction scan results
  if ("simulation" in scanResult || "validation" in scanResult) {
    const txResult = scanResult as BlockAidScanTxResult;
    const { simulation, validation } = txResult;

    if (simulation && "error" in simulation) {
      warnings.push({
        icon: <Icon.MinusCircle />,
        text: simulation.error,
      });
    }

    if (validation && "result_type" in validation) {
      if (validation.description) {
        warnings.push({
          icon:
            validation.result_type === "Malicious" ? (
              <Icon.XCircle />
            ) : (
              <Icon.MinusCircle />
            ),
          text: validation.description,
        });

        if (validation.result_type === "Malicious") {
          isMalicious = true;
        } else if (validation.result_type === "Warning") {
          isSuspicious = true;
        }
      }
    }
  } else {
    // Handle asset scan results
    const assetResult = scanResult as BlockAidScanAssetResult;
    const { result_type, features } = assetResult;
    const _features = features || [];

    // Add feature warnings
    _features.forEach((feature) => {
      warnings.push({
        icon:
          result_type === "Malicious" ? <Icon.XCircle /> : <Icon.MinusCircle />,
        text: feature.description,
      });
    });

    if (result_type === "Malicious") {
      isMalicious = true;
    } else if (result_type === "Warning" || result_type === "Spam") {
      isSuspicious = true;
    }
  }

  return { warnings, isMalicious, isSuspicious };
};

export const BlockAidTxScanExpanded = ({
  scanResult,
  onClose,
}: BlockAidTxScanExpandedProps) => {
  const { t } = useTranslation();
  const shouldTreatTxAsUnableToScan = useShouldTreatTxAsUnableToScan();
  const shouldTreatAssetAsUnableToScan = useShouldTreatAssetAsUnableToScan();

  // Determine if this is an asset or transaction scan result
  const isAssetResult =
    scanResult && "result_type" in scanResult && !("simulation" in scanResult);
  const isUnableToScan = isAssetResult
    ? shouldTreatAssetAsUnableToScan(scanResult as BlockAidScanAssetResult)
    : shouldTreatTxAsUnableToScan(scanResult as BlockAidScanTxResult);

  // Get warnings from scan result (handles both asset and transaction)
  const { warnings, isMalicious, isSuspicious } = getScanWarnings(
    scanResult,
    isUnableToScan,
    t,
  );

  // Early return if no warnings
  if (warnings.length === 0) {
    return null;
  }

  // Determine warning type based on content
  const warningType = isMalicious
    ? "malicious"
    : isSuspicious
      ? "suspicious"
      : "unable-to-scan";

  if (warningType === "malicious") {
    return (
      <div className="BlockaidDetailsExpanded">
        <div className="BlockaidDetailsExpanded__Header">
          <div className="WarningMarkError">
            <Icon.AlertOctagon />
          </div>
          <div className="Close" onClick={onClose}>
            <Icon.X />
          </div>
        </div>
        <div className="BlockaidDetailsExpanded__Title">
          {t("Do not proceed")}
        </div>
        <div className="BlockaidDetailsExpanded__SubTitle">
          {t("This transaction does not appear safe for the following reasons")}
          :
        </div>
        <div className="BlockaidDetailsExpanded__Details">
          {warnings.map((warning, index) => (
            <div
              key={index}
              className={
                warning.icon &&
                React.isValidElement(warning.icon) &&
                warning.icon.type === Icon.XCircle
                  ? "BlockaidDetailsExpanded__DetailRowError"
                  : "BlockaidDetailsExpanded__DetailRow"
              }
            >
              {warning.icon}
              <span>{warning.text}</span>
            </div>
          ))}
          <BlockaidByLine address={""} />
        </div>
      </div>
    );
  }

  return (
    <div className="BlockaidDetailsExpanded">
      <div className="BlockaidDetailsExpanded__Header">
        <div className="WarningMark">
          <Icon.AlertTriangle />
        </div>
        <div className="Close" onClick={onClose}>
          <Icon.X />
        </div>
      </div>
      <div className="BlockaidDetailsExpanded__Title">
        {warningType === "suspicious"
          ? t("Suspicious Request")
          : t("Proceed with caution")}
      </div>
      <div className="BlockaidDetailsExpanded__SubTitle">
        {isAssetResult
          ? t("This token does not appear safe for the following reasons") + ":"
          : t(
              "This transaction does not appear safe for the following reasons",
            ) + ":"}
      </div>
      <div className="BlockaidDetailsExpanded__Details">
        {warnings.map((warning, index) => (
          <div key={index} className="BlockaidDetailsExpanded__DetailRow">
            {warning.icon}
            <span>{warning.text}</span>
          </div>
        ))}
      </div>
      <BlockaidByLine address={""} />
    </div>
  );
};
