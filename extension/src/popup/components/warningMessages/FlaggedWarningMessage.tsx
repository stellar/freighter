import React from "react";
import WarningExclamationIcon from "popup/assets/icon-warning-exclamation.svg";
import WarningShieldIcon from "popup/assets/icon-warning-shield.svg";
import { WarningMessage } from "../WarningMessage";

const DirectoryLink = () => (
  <a href="https://stellar.expert/directory" target="_blank" rel="noreferrer">
    stellar.expert's directory
  </a>
);

const DangerousAccountWarning = ({
  isUnsafe,
  isMalicious,
}: {
  isUnsafe: boolean;
  isMalicious: boolean;
}) => {
  if (isUnsafe) {
    if (isMalicious) {
      return (
        <WarningMessage
          isHighAlert
          icon={WarningExclamationIcon}
          subheader="Malicious account detected"
        >
          <p>
            An account you’re interacting with is tagged as malicious on{" "}
            <DirectoryLink />.
          </p>
          <p>For your safety, signing this transaction is disabled</p>
        </WarningMessage>
      );
    }
    return (
      <WarningMessage
        icon={WarningShieldIcon}
        subheader="Warning: unsafe account"
      >
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
    <WarningMessage
      isHighAlert
      icon={WarningExclamationIcon}
      subheader="Memo is required"
    >
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
