import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@stellar/design-system";

import { Button } from "popup/basics/buttons/Button";

import "./styles.scss";

const DirectoryLink = () => (
  <a href="https://stellar.expert/directory" target="_blank" rel="noreferrer">
    stellar.expert's directory
  </a>
);

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
          Got it
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
  if (isMalicious) {
    return (
      <WarningMessage header="Malicious account detected" isHighAlert>
        <p>
          An account you’re interacting with is tagged as malicious on{" "}
          <DirectoryLink />.
        </p>
        <p>For your safety, signing this transaction is disabled</p>
      </WarningMessage>
    );
  }
  if (isUnsafe) {
    return (
      <WarningMessage header="Unsafe account">
        <p>
          An account you’re interacting with is tagged as unsafe on{" "}
          <DirectoryLink />. Please proceed with caution.
        </p>
      </WarningMessage>
    );
  }

  return null;
};

const MemoWarningMessage = ({ isMemoRequired }: { isMemoRequired: boolean }) =>
  isMemoRequired ? (
    <WarningMessage header="Memo is required" isHighAlert>
      <p>
        A destination account requires the use of the memo field which is not
        present in the transaction you’re about to sign. Freighter automatically
        disabled the option to sign this transaction.
      </p>

      <p>
        Check the destination account memo requirements and include it in the
        transaction.
      </p>
    </WarningMessage>
  ) : null;

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

export const FirstTimeWarningMessage = () => (
  <WarningMessage header="First Time Interaction">
    <p>
      If you believe you have interacted with this domain before, it is possible
      that scammers have copied the original site and/or made small changes to
      the domain name, and that this site is a scam.
    </p>
    <p>
      Double check the domain name. If it is incorrect in any way, do not share
      your public key and contact the site administrator via a verified email or
      social media account to confirm that this domain is correct.
    </p>
  </WarningMessage>
);

export const BackupPhraseWarningMessage = () => (
  <div className="WarningMessage__infoBlock">
    <div className="WarningMessage__header">
      <Icon.AlertTriangle className="WarningMessage__icon" />
      <div>IMPORTANT</div>
    </div>

    <p>
      Keep your recovery phrase in a safe and secure place. Anyone who has
      access to this phrase has access to your account and to the funds in it,
      so save it in a safe and secure place.
    </p>
  </div>
);
