import React from "react";
import OrangeLockIcon from "popup/assets/icon-orange-lock.svg";
import { WarningMessage } from "../WarningMessage";

export const BackupPhraseWarningMessage = () => (
  <WarningMessage
    icon={OrangeLockIcon}
    subheader="Keep your backup phrase in a safe and secure place. 
"
  >
    <p>
      Your backup phrase is the only way to recover your account. We cannot help
      you recover your account.
    </p>
    <p>
      Anyone who has access to this phrase has access to your account and to the
      funds in it, so save it in a safe and secure place.
    </p>
  </WarningMessage>
);
