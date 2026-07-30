import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";
import { Operation, OperationRecord, xdr } from "stellar-sdk";

import { CopyValue } from "popup/components/CopyValue";
import { AuthEntries } from "popup/components/AuthEntry";
import { Details } from "popup/views/SignTransaction/Preview/Details";
import { getAuthEntryBoundAddress } from "popup/helpers/soroban";
import { truncateString } from "helpers/stellar";
import {
  HistoryEntry,
  HistoryOperation,
} from "popup/views/AccountHistory/model";

// Reuse the exact "Transaction details" layout the Send/Swap review flow uses
// (see ReviewTransaction's detailsPane): the DetailsMark/Close header, title,
// the TxInfo summary card, then the shared Operations breakdown.
import "popup/components/InternalTransaction/ReviewTransaction/styles.scss";
import "popup/views/SignTransaction/Preview/Summary/styles.scss";

/** Decode a base64 xdr.Operation into a stellar-sdk Operation (null on failure). */
const decodeOperation = (op: HistoryOperation): Operation | null => {
  try {
    return Operation.fromXDRObject(xdr.Operation.fromXDR(op.xdr, "base64"));
  } catch (error) {
    return null;
  }
};

export const AdvancedDetailsSheet = ({
  entry,
  onBack,
}: {
  entry: HistoryEntry;
  onBack: () => void;
}) => {
  const { t } = useTranslation();

  const operations = entry.details.operations
    .map(decodeOperation)
    .filter((op): op is Operation => op !== null);

  const authEntries = operations
    .filter(
      (op) =>
        (op as Operation.InvokeHostFunction).type === "invokeHostFunction",
    )
    .flatMap((op) => {
      const invoke = op as Operation.InvokeHostFunction;
      return (
        invoke.auth?.map((authEntry) => ({
          invocation: authEntry.rootInvocation(),
          boundAddress: getAuthEntryBoundAddress(authEntry),
        })) ?? []
      );
    });

  return (
    <div className="ReviewTx__TxDetails" data-testid="advanced-sheet">
      <div className="ReviewTx__TxDetails__Header">
        <div className="DetailsMark">
          <Icon.List />
        </div>
        <button
          type="button"
          className="Close"
          data-testid="advanced-back"
          aria-label={t("Close")}
          onClick={onBack}
        >
          <Icon.X />
        </button>
      </div>

      <div className="ReviewTx__TxDetails__Title">
        <span>{t("Transaction details")}</span>
      </div>

      <div className="ReviewTx__TxDetails__Summary">
        {/* The v2 history payload carries no transaction envelope, sequence
            number or memo, so the summary shows the fields it does provide
            (operation count, fee, hash) rather than the dapp-signing Sequence
            #/XDR rows. */}
        <div className="TxInfo" data-testid="advanced-summary">
          <div className="TxInfoBlock">
            <div className="TxInfoBlock__title">
              <p>{t("Operations")}</p>
            </div>
            <p className="TxInfoBlock__value">
              {entry.details.operations.length}
            </p>
          </div>
          <div className="TxInfoBlock">
            <div className="TxInfoBlock__title">
              <p>{t("Fees")}</p>
            </div>
            <p className="TxInfoBlock__value">{entry.details.fee} XLM</p>
          </div>
          <div className="TxInfoBlock">
            <div className="TxInfoBlock__title">
              <p>{t("Hash")}</p>
            </div>
            <span className="TxInfoBlock__value" data-testid="advanced-hash">
              <CopyValue
                value={entry.id}
                displayValue={truncateString(entry.id)}
              />
            </span>
          </div>
        </div>
      </div>

      {authEntries.length ? <AuthEntries entries={authEntries} /> : null}

      <Details
        operations={operations as unknown as OperationRecord[]}
        flaggedKeys={{}}
        isMemoRequired={false}
        scanAssets={false}
      />
    </div>
  );
};
