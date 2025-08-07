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
import IconWarningBlockaid from "popup/assets/icon-warning-blockaid.svg";
import IconWarningBlockaidYellow from "popup/assets/icon-warning-blockaid-yellow.svg";
import { LoadingBackground } from "popup/basics/LoadingBackground";

import {
  isBlockaidWarning,
  reportAssetWarning,
  reportTransactionWarning,
} from "popup/helpers/blockaid";
import { getPunycodedDomain } from "helpers/urls";

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
    <div className="WarningMessage__backup">
      <div className="WarningMessage__infoBlock--warning">
        <div className="DomainNotAllowedWarning">
          <div className="WarningMessage__icon-container">
            <Icon.InfoOctagon className="WarningMessage__icon" />
          </div>
          <span className="ConnectionWarning">
            {getPunycodedDomain(domain)}{" "}
            {t("is currently not connected to this Freighter account")}
          </span>
        </div>
      </div>
    </div>
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

        <p className="BackupWarning">
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

export const BlockaidByLine = ({
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
          <span>Blockaid</span>
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
            <Text as="p" size="sm" weight="medium">
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

export const BlockaidTxScanLabel = ({
  scanResult,
  onClick,
}: {
  scanResult: BlockAidScanTxResult;
  onClick: () => void;
}) => {
  const { t } = useTranslation();
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
                {"This transaction was flagged as suspicious"}
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
  scanResult: BlockAidScanTxResult;
  onClose?: () => void;
}

export const BlockAidTxScanExpanded = ({
  scanResult,
  onClose,
}: BlockAidTxScanExpandedProps) => {
  const { simulation, validation } = scanResult;

  if (simulation && "error" in simulation) {
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
        <div className="BlockaidDetailsExpanded__Title">Warning</div>
        <div className="BlockaidDetailsExpanded__SubTitle">
          This transaction is expected to fail for the following reasons.
        </div>
        <div className="BlockaidDetailsExpanded__Details">
          <div className="BlockaidDetailsExpanded__DetailRow">
            <Icon.MinusCircle />
            <span>{simulation.error}</span>
          </div>
          <BlockaidByLine address={""} />
        </div>
      </div>
    );
  }

  if (validation && "result_type" in validation) {
    switch (validation.result_type) {
      case "Malicious": {
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
            <div className="BlockaidDetailsExpanded__Title">Do not proceed</div>
            <div className="BlockaidDetailsExpanded__SubTitle">
              This transaction does not appear safe for the following reasons.
            </div>
            <div className="BlockaidDetailsExpanded__Details">
              <div className="BlockaidDetailsExpanded__DetailRowError">
                <Icon.XCircle />
                <span>{validation.description}</span>
              </div>
              <BlockaidByLine address={""} />
            </div>
          </div>
        );
      }

      case "Warning": {
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
              Suspicious Request
            </div>
            <div className="BlockaidDetailsExpanded__SubTitle">
              This transaction does not appear safe for the following reasons.
            </div>
            <div className="BlockaidDetailsExpanded__Details">
              <div className="BlockaidDetailsExpanded__DetailRow">
                <Icon.MinusCircle />
                <span>{validation.description}</span>
              </div>
            </div>
            <BlockaidByLine address={""} />
          </div>
        );
      }

      case "Benign":
      default:
    }
  }

  return <></>;
};
