import React from "react";
import classNames from "classnames";
import { Card, Icon } from "@stellar/design-system";

import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { MaliciousDomainWarning } from "../WarningMessages";

import "./styles.scss";

interface ModalInfoProps {
  children: React.ReactNode;
  domain: string;
  subject: string;
  variant?: "default" | "malicious";
}

export const ModalInfo = ({
  children,
  domain,
  subject,
  variant = "default",
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
            <Icon.Link />
            <p>Connection Request</p>
          </div>
        </div>
        {variant === "malicious" && (
          <MaliciousDomainWarning message="This app is likely malicious. Signing messages or transactions from this app could result in losing your assets." />
        )}
        <div className="ModalInfo--subject">{subject}</div>
        {children}
      </Card>
    </div>
  );
};
