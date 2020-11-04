import React from "react";
import WarningShieldIcon from "popup/assets/icon-warning-shield.svg";
import { WarningMessage } from "../WarningMessage";

export const FirstTimeWarningMessage = () => (
  <WarningMessage
    icon={WarningShieldIcon}
    subheader="This is the first time you have interacted with this domain."
  >
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
