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

interface MigrationParagraphProps {
  children: React.ReactNode;
}

export const MigrationParagraph = ({ children }: MigrationParagraphProps) => (
  <Paragraph size="md" className="MigrationParagraph">
    {children}
  </Paragraph>
);
