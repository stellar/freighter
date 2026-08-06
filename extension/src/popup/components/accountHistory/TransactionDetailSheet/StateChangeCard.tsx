import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon, Text } from "@stellar/design-system";

import { Account } from "@shared/api/types/types";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { getAccountName } from "popup/helpers/account";
import {
  DataEntrySelection,
  StateChangeCardData,
  ResolvedToken,
} from "popup/views/AccountHistory/model";
import StellarLogo from "popup/assets/stellar-logo.png";

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

const isXlm = (token: ResolvedToken) =>
  token.code === "XLM" && token.issuer === null;

/** A small round token icon (image, XLM logo, or a lettered fallback). */
const AssetChip = ({ token }: { token: ResolvedToken }) => {
  const [hasError, setHasError] = useState(false);
  const src = isXlm(token) ? StellarLogo : token.icon;

  return (
    <span className="StateChangeCard__asset" data-testid="state-change-asset">
      {src && !hasError ? (
        <img
          className="StateChangeCard__asset-icon"
          src={src}
          alt={token.code}
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="StateChangeCard__asset-icon StateChangeCard__asset-icon--letter">
          {token.code.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span>{token.code}</span>
    </span>
  );
};

interface StateChangeCardProps {
  card: StateChangeCardData;
  allAccounts: Account[];
  onViewDataEntry: (selection: DataEntrySelection) => void;
}

type DataEntryCard = Extract<StateChangeCardData, { kind: "dataEntry" }>;

/**
 * Right-aligned, tappable key rows for a data-entry card. The key is the only
 * value shown inline — the full key/value pair opens in the DataEntrySheet,
 * which is what the trailing info icon advertises (node 12132:62410).
 */
const DataEntryKeys = ({
  card,
  onViewDataEntry,
}: {
  card: DataEntryCard;
  onViewDataEntry: (selection: DataEntrySelection) => void;
}) => (
  <div className="StateChangeCard__keys">
    {card.entries.map((entry) => (
      <button
        key={entry.key}
        type="button"
        className="StateChangeCard__key"
        data-testid="state-change-key"
        onClick={() => onViewDataEntry({ verb: card.verb, entry })}
      >
        <span
          className={
            card.verb === "removed"
              ? "StateChangeCard__key-text StateChangeCard__key-text--removed"
              : "StateChangeCard__key-text"
          }
        >
          {entry.key}
        </span>
        <Icon.InfoCircle />
      </button>
    ))}
  </div>
);

/** The leading icon shown next to a state-change card title, chosen per type. */
const getCardIcon = (kind: StateChangeCardData["kind"]): React.ReactNode => {
  switch (kind) {
    case "accountCreated":
      return <Icon.UserPlus01 />;
    case "accountMerged":
      return <Icon.UserX01 />;
    case "signers":
      return <Icon.Users01 />;
    case "thresholds":
      return <Icon.ShieldTick />;
    case "dataEntry":
      return <Icon.Data />;
    case "homeDomain":
      return <Icon.Globe02 />;
    case "flags":
      return <Icon.Flag01 />;
    case "trustlines":
      return <Icon.Coins01 />;
    case "balanceAuthorizations":
      return <Icon.Lock01 />;
    case "allowance":
      return <Icon.CheckDone01 />;
    default:
      return <Icon.Settings04 />;
  }
};

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
      case "allowance":
        return t("Allowance approved");
      default:
        return "";
    }
  };
};

const CardBody = ({
  card,
  allAccounts,
  onViewDataEntry,
}: {
  card: StateChangeCardData;
  allAccounts: Account[];
  onViewDataEntry: (selection: DataEntrySelection) => void;
}) => {
  const { t } = useTranslation();

  switch (card.kind) {
    case "accountCreated":
      return (
        <>
          <Row label={t("Account")}>
            <KeyIdenticon
              publicKey={card.address}
              variant="plain"
              label={getAccountName(allAccounts, card.address)}
            />
          </Row>
          {card.funder ? (
            <Row label={t("Funder")}>
              <KeyIdenticon
                publicKey={card.funder}
                variant="plain"
                label={getAccountName(allAccounts, card.funder)}
              />
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
                <KeyIdenticon
                  publicKey={signer.address}
                  variant="plain"
                  label={getAccountName(allAccounts, signer.address)}
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
      return <DataEntryKeys card={card} onViewDataEntry={onViewDataEntry} />;
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
        <div className="StateChangeCard__assets">
          {card.entries.map((line) => (
            <div
              key={line.token.code}
              className="StateChangeCard__asset-entry"
              data-testid="state-change-row"
            >
              <AssetChip token={line.token} />
              {card.verb === "updated" ? (
                <div className="StateChangeCard__asset-limit">
                  <OldNew oldValue={line.limitOld} newValue={line.limitNew} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      );
    case "balanceAuthorizations":
      return (
        <Row label={t("Assets")}>
          {card.tokens.map((tok) => tok.code).join(", ")}
        </Row>
      );
    case "allowance":
      return (
        <>
          <Row label={t("Asset")}>
            <AssetChip token={card.token} />
          </Row>
          <Row label={t("Spender")}>
            <KeyIdenticon
              publicKey={card.spender}
              variant="plain"
              label={getAccountName(allAccounts, card.spender)}
            />
          </Row>
          <Row label={t("Amount")}>
            {card.amount ?? "—"} {card.token.code}
          </Row>
          <Row label={t("Expires at ledger")}>{card.expirationLedger}</Row>
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
  const { t } = useTranslation();
  const getTitle = useCardTitle();
  const isInline = card.kind === "trustlines";
  const isDataEntry = card.kind === "dataEntry";
  // Key rows sit tighter under their header than the other cards' rows do
  const layoutClass = isInline
    ? "StateChangeCard__inline"
    : `StateChangeCard__stacked${
        isDataEntry ? " StateChangeCard__stacked--keys" : ""
      }`;

  return (
    <div className="StateChangeCard" data-testid="state-change-card">
      <div className={layoutClass}>
        <Text
          as="div"
          size="md"
          weight="medium"
          addlClassName="StateChangeCard__title"
        >
          <span className="StateChangeCard__title-icon" aria-hidden="true">
            {getCardIcon(card.kind)}
          </span>
          <span data-testid="state-change-title">{getTitle(card)}</span>
          {/* Data-entry cards label the right-hand column of key rows */}
          {isDataEntry ? (
            <span className="StateChangeCard__column-label">{t("Key")}</span>
          ) : null}
        </Text>
        <div className="StateChangeCard__body">
          <CardBody
            card={card}
            allAccounts={allAccounts}
            onViewDataEntry={onViewDataEntry}
          />
        </div>
      </div>
    </div>
  );
};
