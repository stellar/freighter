import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Operation, OperationRecord, Transaction } from "stellar-sdk";

import { OPERATION_TYPES } from "constants/transaction";
import { AuthEntries } from "popup/components/AuthEntry";
import { Summary } from "popup/views/SignTransaction/Preview/Summary";
import { Details } from "popup/views/SignTransaction/Preview/Details";
import { getAuthEntryBoundAddress } from "popup/helpers/soroban";

import "./styles.scss";

interface EarnTransactionDetailsProps {
  /** The decoded deposit. */
  transaction: Transaction;
  /** Its envelope, shown and copied by Summary. */
  xdr: string;
  onClose: () => void;
  /** Prefix for the pane's test ids, so each host keeps its own. */
  testIdPrefix: string;
}

/**
 * The full breakdown of a deposit — summary, auth entries and every operation —
 * built from the dapp-signing Preview pieces. It replaces its host sheet's body
 * in place: the review before signing, and the deposit details after.
 */
export const EarnTransactionDetails = ({
  transaction,
  xdr,
  onClose,
  testIdPrefix,
}: EarnTransactionDetailsProps) => {
  const { t } = useTranslation();
  const invocation = transaction.operations[0] as
    | Operation.InvokeHostFunction
    | undefined;
  const authEntries =
    invocation?.auth?.map((authEntry) => ({
      invocation: authEntry.rootInvocation,
      boundAddress: getAuthEntryBoundAddress(authEntry),
    })) ?? [];

  return (
    <div
      className="EarnTransactionDetails"
      data-testid={`${testIdPrefix}-details-pane`}
    >
      <div className="EarnTransactionDetails__header">
        <div className="EarnTransactionDetails__title">
          {t("Transaction details")}
        </div>
        <button
          type="button"
          className="EarnTransactionDetails__close"
          aria-label={t("Close")}
          onClick={onClose}
        >
          <Icon.X />
        </button>
      </div>
      <div
        className="EarnTransactionDetails__body"
        data-testid={`${testIdPrefix}-details-body`}
      >
        <Summary
          sequenceNumber={transaction.sequence}
          fee={transaction.fee}
          memo={undefined}
          xdr={xdr}
          operationNames={transaction.operations.map(
            (op) =>
              OPERATION_TYPES[op.type as keyof typeof OPERATION_TYPES] ||
              op.type,
          )}
        />
        {authEntries.length > 0 && <AuthEntries entries={authEntries} />}
        <Details
          operations={transaction.operations as unknown as OperationRecord[]}
          flaggedKeys={{}}
          isMemoRequired={false}
          scanAssets={false}
        />
      </div>
    </div>
  );
};
