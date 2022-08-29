import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createPortal } from "react-dom";
import { InfoBlock, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { POPUP_HEIGHT } from "constants/dimensions";

import { Button } from "popup/basics/buttons/Button";
import { closeBlockedDomainWarning } from "popup/ducks/transactionSubmission";
import { settingsSelector } from "popup/ducks/settings";
import { ManageAssetRow } from "popup/components/manageAssets/ManageAssetRows";

import "./styles.scss";

const DirectoryLink = () => {
  const { t } = useTranslation();
  return (
    <a href="https://stellar.expert/directory" target="_blank" rel="noreferrer">
      stellar.expert's {t("directory")}
    </a>
  );
};

interface WarningMessageProps {
  header: string;
  children: React.ReactNode;
  handleCloseClick?: () => void;
  isActive?: boolean;
  isHighAlert?: boolean;
}

export const WarningMessage = ({
  handleCloseClick,
  header,
  isActive = false,
  isHighAlert = false,
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
      className={`WarningMessage__infoBlock ${
        isHighAlert ? "WarningMessage__infoBlock--high-alert" : ""
      }`}
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
      <WarningMessage header="Malicious account detected" isHighAlert>
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
      <WarningMessage header="Unsafe account">
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
    <WarningMessage header="Memo is required" isHighAlert>
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
    <WarningMessage header="First Time Interaction">
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
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const warningRef = useRef<HTMLDivElement>(null);
  const { isValidatingSafeAssetsEnabled } = useSelector(settingsSelector);

  const closeOverlay = () => {
    if (warningRef.current) {
      warningRef.current.style.bottom = `-${POPUP_HEIGHT}px`;
    }
    setTimeout(() => {
      dispatch(closeBlockedDomainWarning());
    }, 300);
  };

  // animate entry
  useEffect(() => {
    if (warningRef.current) {
      warningRef.current.style.bottom = "0";
    }
  }, [warningRef]);

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
          <div className="ScamAssetWarning__btns">
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
