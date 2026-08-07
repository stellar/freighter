import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Text } from "@stellar/design-system";

import { DataEntrySelection } from "popup/views/AccountHistory/model";

/** True when the text holds control characters, i.e. it isn't printable. */
const hasControlChars = (text: string) =>
  [...text].some((char) => {
    const code = char.charCodeAt(0);
    if (code < 32) {
      // allow the whitespace controls (tab, LF, VT, FF, CR)
      return code < 9 || code > 13;
    }
    return code === 127 || (code >= 128 && code <= 159);
  });

/** Throws on invalid UTF-8 rather than substituting replacement characters. */
const utf8 = new TextDecoder("utf-8", { fatal: true });

const toBytes = (b64: string) =>
  Uint8Array.from(atob(b64), (char) => char.charCodeAt(0));

/**
 * Decode base64 to a printable UTF-8 string, else return the base64 as-is.
 *
 * Data entry values are arbitrary bytes, so both branches are common. Decoding
 * has to be strict UTF-8: latin1 would turn multi-byte text into mojibake that
 * still looks printable, and so would render as if it had decoded cleanly.
 */
export const decodeDataValue = (b64: string | null): string | null => {
  if (!b64) {
    return null;
  }
  try {
    const decoded = utf8.decode(toBytes(b64));
    // ASCII control bytes are valid UTF-8, so binary can survive the decode.
    if (hasControlChars(decoded)) {
      return b64;
    }
    return decoded;
  } catch (e) {
    return b64;
  }
};

/**
 * Expanded view of a single data entry, opened from a key row in the
 * detail sheet's data-entry card: the untruncated key and value, each in its
 * own filled field (node 12150:63302).
 */
export const DataEntrySheet = ({
  selection,
  onClose,
}: {
  selection: DataEntrySelection;
  onClose: () => void;
}) => {
  const { t } = useTranslation();
  const { verb, entry } = selection;
  const value = decodeDataValue(entry.valueNewB64 ?? entry.valueOldB64);

  return (
    <div className="DataEntrySheet" data-testid="data-entry-sheet">
      <div className="DataEntrySheet__header">
        <Text
          as="div"
          size="xl"
          weight="medium"
          addlClassName="DataEntrySheet__title"
        >
          {`${t("Data entry")} ${verb}`}
        </Text>
        <button
          type="button"
          className="DataEntrySheet__dismiss"
          aria-label={t("Close")}
          data-testid="data-entry-dismiss"
          onClick={onClose}
        >
          <Icon.X />
        </button>
      </div>

      <div className="DataEntrySheet__fields">
        <div className="DataEntrySheet__field">
          <Text
            as="div"
            size="sm"
            weight="medium"
            addlClassName="DataEntrySheet__label"
          >
            {t("Key")}
          </Text>
          <div className="DataEntrySheet__value" data-testid="data-entry-key">
            {entry.key}
          </div>
        </div>

        <div className="DataEntrySheet__field">
          <Text
            as="div"
            size="sm"
            weight="medium"
            addlClassName="DataEntrySheet__label"
          >
            {t("Value")}
          </Text>
          <div className="DataEntrySheet__value" data-testid="data-entry-value">
            {value ?? t("None")}
          </div>
        </div>
      </div>

      <div className="DataEntrySheet__footer">
        <Button
          size="lg"
          variant="secondary"
          isFullWidth
          isRounded
          data-testid="data-entry-close"
          onClick={onClose}
        >
          {t("Close")}
        </Button>
      </div>
    </div>
  );
};
