import React from "react";
import { InfoBlock } from "@stellar/design-system";

import "./styles.scss";

const DirectoryLink = () => (
  <a href="https://stellar.expert/directory" target="_blank" rel="noreferrer">
    stellar.expert's directory
  </a>
);

interface WarningMessageProps {
  header: string;
  children: React.ReactNode;
}

export const WarningMessage = ({ header, children }: WarningMessageProps) => (
  <div className="WarningMessage">
    <InfoBlock variant={InfoBlock.variant.warning}>
      <p className="WarningMessage--header">{header}</p>

      {children}
    </InfoBlock>
  </div>
);

const DangerousAccountWarning = ({
  isUnsafe,
  isMalicious,
}: {
  isUnsafe: boolean;
  isMalicious: boolean;
}) => {
  if (isMalicious) {
    return (
      <WarningMessage header="Malicious account detected">
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
      <WarningMessage header="Warning: unsafe account">
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
    <WarningMessage header="Memo is required">
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
  <WarningMessage header="This is the first time you have interacted with this domain.">
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
  <WarningMessage header="Keep your backup phrase in a safe and secure place.">
    <p>
      Anyone who has access to this phrase has access to your account and to the
      funds in it, so save it in a safe and secure place.
    </p>
  </WarningMessage>
);
