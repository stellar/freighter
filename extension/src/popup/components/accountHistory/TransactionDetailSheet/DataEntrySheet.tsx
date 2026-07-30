import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Text } from "@stellar/design-system";

import { CopyChip } from "popup/components/accountHistory/CopyChip";
import { StateChangeCardData } from "popup/views/AccountHistory/model";

type DataEntryCard = Extract<StateChangeCardData, { kind: "dataEntry" }>;

/** Decode base64 to a printable UTF-8 string, else return the base64 as-is. */
export const decodeDataValue = (b64: string | null): string | null => {
  if (!b64) {
    return null;
  }
  try {
    const decoded = atob(b64);
    // eslint-disable-next-line no-control-regex
    if (/[\u0000-\u0008\u000e-\u001f]/.test(decoded)) {
      return b64;
    }
    return decoded;
  } catch (e) {
    return b64;
  }
};

export const DataEntrySheet = ({
  card,
  onClose,
}: {
  card: DataEntryCard;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const value = decodeDataValue(card.valueNewB64 ?? card.valueOldB64);

  return (
    <div className="TransactionDetailSheet" data-testid="data-entry-sheet">
      <div className="TransactionDetailSheet__header">
        <div className="TransactionDetailSheet__header-body">
          <Text
            as="div"
            size="md"
            weight="medium"
            addlClassName="TransactionDetailSheet__header-title"
          >
            {`${t("Data entry")} ${card.verb}`}
          </Text>
        </div>
      </div>

      <div className="TransactionDetailSheet__card">
        <div className="TransactionDetailSheet__meta-row">
          <Text
            as="span"
            size="sm"
            addlClassName="TransactionDetailSheet__meta-label"
          >
            {t("Key")}
          </Text>
          <Text
            as="span"
            size="sm"
            addlClassName="TransactionDetailSheet__meta-value"
          >
            <span data-testid="data-entry-key">{card.key}</span>
          </Text>
        </div>
        <div className="TransactionDetailSheet__meta-row">
          <Text
            as="span"
            size="sm"
            addlClassName="TransactionDetailSheet__meta-label"
          >
            {t("Value")}
          </Text>
          <span data-testid="data-entry-value">
            {value ? (
              <CopyChip value={value} displayValue={value} />
            ) : (
              t("None")
            )}
          </span>
        </div>
      </div>

      <div className="TransactionDetailSheet__footer">
        <Button
          size="md"
          variant="tertiary"
          isFullWidth
          data-testid="data-entry-close"
          onClick={onClose}
        >
          <Icon.ArrowLeft />
          {t("Close")}
        </Button>
      </div>
    </div>
  );
};
