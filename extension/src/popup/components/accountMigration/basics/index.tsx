import React from "react";
import { Heading, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { truncatedPublicKey } from "helpers/stellar";

import "./styles.scss";

interface MigrationBasicProps {
  children: React.ReactNode;
}

export const MigrationHeader = ({ children }: MigrationBasicProps) => (
  <div className="MigrationHeader">
    <Heading as="h1" size="xl">
      {children}
    </Heading>
  </div>
);

type MigrationBodyProps = MigrationBasicProps & {
  hasWarning?: boolean;
};

export const MigrationBody = ({ children, hasWarning }: MigrationBodyProps) => (
  <div
    className={`MigrationBody  ${hasWarning ? "MigrationBody--warning" : ""}`}
  >
    {children}
  </div>
);

export const MigrationParagraph = ({ children }: MigrationBasicProps) => (
  <Text as="p" size="md" className="MigrationParagraph">
    {children}
  </Text>
);

export const MigrationButton = ({ children }: MigrationBasicProps) => (
  <Text as="p" size="md" className="MigrationButton">
    {children}
  </Text>
);

export const MigrationReviewHeader = ({ children }: MigrationBasicProps) => (
  <header className="MigrationReviewHeader">{children}</header>
);

type MigrationReviewListSectionProps = MigrationBasicProps & {
  isUnfunded?: boolean;
};

export const MigrationReviewListSection = ({
  children,
  isUnfunded,
}: MigrationReviewListSectionProps) => (
  <section
    className={`MigrationReviewListSection ${
      isUnfunded ? "MigrationReviewListSection--unfunded" : ""
    }`}
  >
    {children}
  </section>
);

export const MigrationReviewAccountRow = ({
  children,
}: MigrationBasicProps) => (
  <div className="MigrationReviewAccountRow">{children}</div>
);

export const MigrationReviewDetailRow = ({ children }: MigrationBasicProps) => (
  <div className="MigrationReviewDetailRow">{children}</div>
);

interface MigrationReviewHighlightProps {
  text: string;
}

export const MigrationReviewHighlight = ({
  text,
}: MigrationReviewHighlightProps) => (
  <span className="MigrationReviewHighlight">{text}</span>
);

interface MigrationReviewDescriptionProps {
  description: string;
  highlight: string;
}

export const MigrationReviewDescription = ({
  description,
  highlight,
}: MigrationReviewDescriptionProps) => {
  const { t } = useTranslation();
  return (
    <section className="MigrationReviewDescription">
      {`${t(description)}: `}
      <MigrationReviewHighlight text={`${highlight} ${t("XLM")}`} />
    </section>
  );
};

export const MigrationReviewListHeader = ({
  children,
}: MigrationBasicProps) => (
  <div className="MigrationReviewListHeader">{children}</div>
);

export const MigrationReviewAccountInfo = ({
  publicKey,
  name,
  isDisabled,
}: {
  publicKey: string;
  name: string;
  isDisabled?: boolean;
}) => (
  <div
    className={`MigrationReviewAccountInfo ${
      isDisabled ? "MigrationReviewAccountInfo--isDisabled" : ""
    }`}
  >
    <div className="MigrationReviewAccountInfo__identicon-wrapper">
      <IdenticonImg publicKey={publicKey} />
    </div>
    <div className="MigrationReviewAccountInfo__text">
      <div className="MigrationReviewAccountInfo__name">{name}</div>
      <div className="MigrationReviewAccountInfo__public-key">
        ({truncatedPublicKey(publicKey)})
      </div>
    </div>
  </div>
);

export const MigrationReviewBadge = ({ children }: MigrationBasicProps) => (
  <div className="MigrationReviewBadge">{children}</div>
);
