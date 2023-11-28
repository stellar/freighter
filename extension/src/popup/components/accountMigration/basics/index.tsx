import React from "react";
import { Heading, Paragraph } from "@stellar/design-system";

import "./styles.scss";

interface MigrationHeaderProps {
  children: React.ReactNode;
}

export const MigrationHeader = ({ children }: MigrationHeaderProps) => (
  <div className="MigrationHeader">
    <Heading as="h1" size="md">
      {children}
    </Heading>
  </div>
);

interface MigrationBodyProps {
  children: React.ReactNode;
  hasWarning?: boolean;
}

export const MigrationBody = ({ children, hasWarning }: MigrationBodyProps) => (
  <div
    className={`MigrationBody  ${hasWarning ? "MigrationBody--warning" : ""}`}
  >
    {children}
  </div>
);

interface MigrationParagraphProps {
  children: React.ReactNode;
}

export const MigrationParagraph = ({ children }: MigrationParagraphProps) => (
  <Paragraph size="md" className="MigrationParagraph">
    {children}
  </Paragraph>
);

interface MigrationButtonProps {
  children: React.ReactNode;
}

export const MigrationButton = ({ children }: MigrationButtonProps) => (
  <Paragraph size="md" className="MigrationButton">
    {children}
  </Paragraph>
);
