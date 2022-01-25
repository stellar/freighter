import React from "react";

import { Card } from "popup/basics/Card";
import { PunycodedDomain } from "popup/components/PunycodedDomain";

import "./styles.scss";

interface ModalInfoProps {
  children: React.ReactNode;
  domain: string;
  domainTitle: string;
  subject: string;
  title: string;
}

export const ModalInfo = ({
  children,
  domain,
  domainTitle,
  subject,
  title,
}: ModalInfoProps) => (
  <>
    <div className="ModalInfo--header">
      <p>
        <strong>{title}</strong>
      </p>
    </div>
    <div className="ModalInfo--card">
      <Card variant={Card.variant.highlight}>
        <PunycodedDomain domain={domain} domainTitle={domainTitle} />
        <div className="ModalInfo--subject">{subject}</div>
        {children}
      </Card>
    </div>
  </>
);
