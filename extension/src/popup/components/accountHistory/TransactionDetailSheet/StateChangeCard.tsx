import React from "react";
import { useTranslation } from "react-i18next";
import { Text } from "@stellar/design-system";

import { Account } from "@shared/api/types/types";
import { AvatarChip } from "popup/components/accountHistory/AvatarChip";
import { truncateString } from "helpers/stellar";
import { StateChangeCardData } from "popup/views/AccountHistory/model";

const OldNew = ({
  oldValue,
  newValue,
}: {
  oldValue: string | null;
  newValue: string | null;
}) => (
  <span className="StateChangeCard__oldnew" data-testid="state-change-oldnew">
    {oldValue !== null ? (
      <span className="StateChangeCard__old">{oldValue}</span>
    ) : null}
    {oldValue !== null && newValue !== null ? (
      <span className="StateChangeCard__arrow"> {"\u2192"} </span>
    ) : null}
    {newValue !== null ? (
      <span className="StateChangeCard__new">{newValue}</span>
    ) : null}
  </span>
);

const Row = ({
  label,
  children,
}: {
  label: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div className="StateChangeCard__row" data-testid="state-change-row">
    <span className="StateChangeCard__row-label">{label}</span>
    {children ? (
      <span className="StateChangeCard__row-value">{children}</span>
    ) : null}
  </div>
);

interface StateChangeCardProps {
  card: StateChangeCardData;
  allAccounts: Account[];
  onViewDataEntry: (
    card: Extract<StateChangeCardData, { kind: "dataEntry" }>,
  ) => void;
}

const useCardTitle = () => {
  const { t } = useTranslation();
  return (card: StateChangeCardData): string => {
    switch (card.kind) {
      case "accountCreated":
        return t("Account created");
      case "accountMerged":
        return t("Account merged");
      case "signers":
        return `${t("Signer")} ${card.verb}`;
      case "thresholds":
        return t("Threshold updated");
      case "dataEntry":
        return `${t("Data entry")} ${card.verb}`;
      case "homeDomain":
        return `${t("Home domain")} ${card.verb}`;
      case "flags":
        return t("Account setting updated");
      case "trustlines":
        return `${t("Trustline")} ${card.verb}`;
      case "balanceAuthorizations":
        return card.authorized
          ? t("Balance authorized")
          : t("Balance unauthorized");
      case "reserves":
        return card.verb === "sponsored"
          ? t("Reserve sponsored")
          : t("Reserve unsponsored");
      default:
        return "";
    }
  };
};

const CardBody = ({
  card,
  allAccounts,
}: {
  card: StateChangeCardData;
  allAccounts: Account[];
}) => {
  const { t } = useTranslation();

  switch (card.kind) {
    case "accountCreated":
      return (
        <>
          <Row label={t("Account")}>
            <AvatarChip address={card.address} allAccounts={allAccounts} />
          </Row>
          {card.funder ? (
            <Row label={t("Funder")}>
              <AvatarChip address={card.funder} allAccounts={allAccounts} />
            </Row>
          ) : null}
        </>
      );
    case "accountMerged":
      return null;
    case "signers":
      return (
        <>
          {card.entries.map((signer) => (
            <Row
              key={signer.address}
              label={
                <AvatarChip
                  address={signer.address}
                  allAccounts={allAccounts}
                />
              }
            >
              <OldNew
                oldValue={
                  signer.weightOld !== null ? String(signer.weightOld) : null
                }
                newValue={
                  signer.weightNew !== null ? String(signer.weightNew) : null
                }
              />
            </Row>
          ))}
        </>
      );
    case "thresholds":
      return (
        <Row label={card.level}>
          <OldNew oldValue={card.valueOld} newValue={card.valueNew} />
        </Row>
      );
    case "homeDomain":
      return (
        <Row label={t("Domain")}>
          <OldNew oldValue={card.domainOld} newValue={card.domainNew} />
        </Row>
      );
    case "dataEntry":
      return <Row label={card.key} />;
    case "flags":
      return (
        <div className="StateChangeCard__flags">
          {card.set.map((flag) => (
            <span
              key={`set-${flag}`}
              className="StateChangeCard__flag StateChangeCard__flag--set"
              data-testid="state-change-flag-set"
            >
              +{flag}
            </span>
          ))}
          {card.cleared.map((flag) => (
            <span
              key={`cleared-${flag}`}
              className="StateChangeCard__flag StateChangeCard__flag--cleared"
              data-testid="state-change-flag-cleared"
            >
              {"\u2212"}
              {flag}
            </span>
          ))}
        </div>
      );
    case "trustlines":
      return (
        <>
          {card.entries.map((line) => (
            <Row key={line.token.code} label={line.token.code}>
              <OldNew oldValue={line.limitOld} newValue={line.limitNew} />
            </Row>
          ))}
        </>
      );
    case "balanceAuthorizations":
      return (
        <Row label={t("Assets")}>
          {card.tokens.map((tok) => tok.code).join(", ")}
        </Row>
      );
    case "reserves":
      return (
        <>
          {card.sponsor ? (
            <Row label={t("Sponsor")}>
              <AvatarChip address={card.sponsor} allAccounts={allAccounts} />
            </Row>
          ) : null}
          {card.sponsored ? (
            <Row label={t("Sponsored")}>
              <AvatarChip address={card.sponsored} allAccounts={allAccounts} />
            </Row>
          ) : null}
          {card.detail ? <Row label={truncateString(card.detail, 6)} /> : null}
        </>
      );
    default:
      return null;
  }
};

export const StateChangeCard = ({
  card,
  allAccounts,
  onViewDataEntry,
}: StateChangeCardProps) => {
  const getTitle = useCardTitle();
  const isDataEntry = card.kind === "dataEntry";

  const content = (
    <>
      <Text
        as="div"
        size="md"
        weight="medium"
        addlClassName="StateChangeCard__title"
      >
        <span data-testid="state-change-title">{getTitle(card)}</span>
      </Text>
      <div className="StateChangeCard__body">
        <CardBody card={card} allAccounts={allAccounts} />
      </div>
    </>
  );

  if (isDataEntry) {
    return (
      <button
        type="button"
        className="StateChangeCard StateChangeCard--interactive"
        data-testid="state-change-card"
        onClick={() =>
          onViewDataEntry(
            card as Extract<StateChangeCardData, { kind: "dataEntry" }>,
          )
        }
      >
        {content}
      </button>
    );
  }

  return (
    <div className="StateChangeCard" data-testid="state-change-card">
      {content}
    </div>
  );
};
