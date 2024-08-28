import React from "react";
import { Card, Icon } from "@stellar/design-system";

import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { BlockAidSiteScanLabel } from "../WarningMessages";

import "./styles.scss";

interface ModalInfoProps {
  children: React.ReactNode;
  domain: string;
  subject: string;
  isMalicious: boolean;
  scanStatus: "hit" | "miss";
}

export const ModalInfo = ({
  children,
  domain,
  subject,
  isMalicious,
  scanStatus,
}: ModalInfoProps) => (
  <div className="ModalInfo--card">
    <Card variant="secondary">
      <PunycodedDomain domain={domain} />
      <div className="ModalInfo--connection-request">
        <div className="ModalInfo--connection-request-pill">
          <Icon.Link />
          <p>Connection Request</p>
        </div>
      </div>
      <BlockAidSiteScanLabel isMalicious={isMalicious} status={scanStatus} />
      <div className="ModalInfo--subject">{subject}</div>
      {children}
    </Card>
  </div>
);
