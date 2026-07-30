import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Button, Icon } from "@stellar/design-system";

import { NetworkDetails } from "@shared/constants/stellar";
import { allAccountsSelector } from "popup/ducks/accountServices";
import { openTab } from "popup/helpers/navigate";
import { getStellarExpertUrl } from "popup/helpers/account";
import {
  HistoryEntry,
  StateChangeCardData,
} from "popup/views/AccountHistory/model";

import { DetailHeader } from "./DetailHeader";
import { BalanceChangesCard } from "./BalanceChangesCard";
import { StateChangeCard } from "./StateChangeCard";
import { DataEntrySheet } from "./DataEntrySheet";
import { AdvancedDetailsSheet } from "./AdvancedDetailsSheet";
import { MetaCard } from "./MetaCard";

import "../TransactionDetail/styles.scss";
import "./styles.scss";

type SheetView = "detail" | "advanced" | "dataEntry";

type DataEntryCard = Extract<StateChangeCardData, { kind: "dataEntry" }>;

const counterpartyDirectionFor = (
  entry: HistoryEntry,
): "to" | "from" | null => {
  if (entry.kind === "sent") {
    return "to";
  }
  if (entry.kind === "received") {
    return "from";
  }
  return null;
};

export const TransactionDetailSheet = ({
  entry,
  networkDetails,
}: {
  entry: HistoryEntry;
  networkDetails: NetworkDetails;
}) => {
  const { t } = useTranslation();
  const allAccounts = useSelector(allAccountsSelector);
  const [view, setView] = useState<SheetView>("detail");
  const [activeDataEntry, setActiveDataEntry] = useState<DataEntryCard | null>(
    null,
  );

  const stellarExpertUrl = getStellarExpertUrl(networkDetails);

  const openDataEntry = (card: DataEntryCard) => {
    setActiveDataEntry(card);
    setView("dataEntry");
  };

  if (view === "dataEntry" && activeDataEntry) {
    return (
      <DataEntrySheet
        card={activeDataEntry}
        onClose={() => {
          setActiveDataEntry(null);
          setView("detail");
        }}
      />
    );
  }

  if (view === "advanced") {
    return (
      <div className="TransactionDetailModal">
        <AdvancedDetailsSheet entry={entry} onBack={() => setView("detail")} />
      </div>
    );
  }

  return (
    <div
      className="TransactionDetailModal TransactionDetailSheet"
      data-testid="transaction-detail-sheet"
    >
      <DetailHeader entry={entry} />

      {/* Figma groups state changes above the balance amounts (e.g. the
          "Added signer" rows sit on top of Sent/Received), both above the
          Status/Fee meta card — see node 12045:41260. */}
      {entry.details.stateChangeCards.map((card, i) => (
        <StateChangeCard
          key={`${card.kind}-${i}`}
          card={card}
          allAccounts={allAccounts}
          onViewDataEntry={openDataEntry}
        />
      ))}

      <BalanceChangesCard
        details={entry.details}
        counterpartyDirection={counterpartyDirectionFor(entry)}
        allAccounts={allAccounts}
      />

      <MetaCard details={entry.details} />

      <button
        type="button"
        className="TransactionDetailSheet__advanced-link"
        data-testid="transaction-details-link"
        onClick={() => setView("advanced")}
      >
        <Icon.List />
        <span>{t("Transaction details")}</span>
      </button>

      <div className="TransactionDetailSheet__footer">
        <Button
          size="lg"
          variant="secondary"
          isFullWidth
          isRounded
          data-testid="view-on-stellar-expert"
          icon={<Icon.LinkExternal01 />}
          iconPosition="right"
          onClick={() => openTab(`${stellarExpertUrl}/tx/${entry.id}`)}
        >
          {t("View on")} stellar.expert
        </Button>
      </div>
    </div>
  );
};
