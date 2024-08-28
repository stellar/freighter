import React from "react";
import classNames from "classnames";
import { Card, Icon } from "@stellar/design-system";

import { PunycodedDomain } from "popup/components/PunycodedDomain";
import IconShieldPlus from "popup/assets/icon-shield-plus.svg";
import { MaliciousDomainWarning } from "../WarningMessages";

import "./styles.scss";

interface ModalInfoProps {
  children: React.ReactNode;
  domain: string;
  subject: string;
  variant?: "default" | "malicious";
  isTrustline?: boolean;
}

export const ModalInfo = ({
  children,
  domain,
  subject,
  variant = "default",
  isTrustline = false,
}: ModalInfoProps) => {
  const cardClasses = classNames("ModalInfo--card", {
    Malicious: variant === "malicious",
  });
  return (
    <div className={cardClasses}>
      <Card variant="secondary">
        <PunycodedDomain domain={domain} />
        <div className="ModalInfo--connection-request">
          <div className="ModalInfo--connection-request-pill">
            {isTrustline ? (
              <img src={IconShieldPlus} alt="Add trustline icon" />
            ) : (
              <Icon.Link />
            )}
            <div>
              {isTrustline ? "Add asset trustline" : "Connection Request"}
            </div>
          </div>
        </div>
        {variant === "malicious" && (
          <MaliciousDomainWarning message="This app is likely malicious. Signing messages or transactions from this app could result in losing your assets." />
        )}
        {subject && <div className="ModalInfo--subject">{subject}</div>}
        {children}
      </Card>
    </div>
  );
};
