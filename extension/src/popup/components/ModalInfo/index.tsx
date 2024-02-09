import React from "react";

import { Card, Icon } from "@stellar/design-system";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { FirstTimeWarningMessage } from "popup/components/WarningMessages";

import "./styles.scss";

interface ModalInfoProps {
  children: React.ReactNode;
  domain: string;
  domainTitle: string;
  subject: string;
}

export const ModalInfo = ({
  children,
  domain,
  domainTitle,
  subject,
}: ModalInfoProps) => (
  <>
    <div className="ModalInfo--card">
      <Card variant="secondary">
        <PunycodedDomain domain={domain} domainTitle={domainTitle} />
        <div className="ModalInfo--connection-request">
          <div className="ModalInfo--connection-request-pill">
            <Icon.Link />
            <p>Connection Request</p>
          </div>
        </div>
        <FirstTimeWarningMessage />
        <div className="ModalInfo--subject">{subject}</div>
        {children}
      </Card>
    </div>
  </>
);
