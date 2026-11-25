import React, { useEffect, useMemo, useState } from "react";
import { Button, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Transaction, TransactionBuilder } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { isCustomNetwork } from "@shared/helpers/stellar";
import { stroopToXlm } from "helpers/stellar";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { EarnTransactionDetails } from "popup/components/earn/EarnTransactionDetails";
import { formatDepositDate } from "popup/components/earn/helpers/formatDepositDate";
import { formatEarnAmount } from "popup/components/earn/helpers/formatEarnAmount";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";
import { StatRow } from "popup/components/earn/StatRow";
import { SheetHeader, SheetHeaderLayout } from "popup/components/SheetHeader";
import { SheetLayout } from "popup/components/SheetLayout";
import { TransactionDetailsButton } from "popup/components/TransactionDetailsButton";
import { getStellarExpertUrl } from "popup/helpers/account";
import { NO_FIAT_VALUE } from "popup/helpers/formatters";
import { openTab } from "popup/helpers/navigate";
import { AssetIcons } from "@shared/api/types";

import "./styles.scss";

/** Which way the money moved. */
export type EarnDetailsType = "deposit" | "withdraw";

interface EarnDepositDetailsSheetProps {
  /** Deposit (the default) or withdrawal. */
  type?: EarnDetailsType;
  /** The amount moved, unformatted and unsigned. */
  amount: string;
  assetCode: string;
  assetIssuer?: string;
  assetIcons: AssetIcons;
  /** The pool's backend name; formatPoolName falls back when it has none. */
  poolName?: string | null;
  transactionHash: string;
  /**
   * The envelope, decoded for "Transaction details". The deposit flow passes
   * the one it just submitted; without it the sheet takes Horizon's, from the
   * same request that brings the date and fee.
   */
  xdr?: string;
  /** When the event happened, if known: shown until Horizon's date lands. */
  occurredAt?: string;
  networkDetails: NetworkDetails;
  onClose: () => void;
}

/**
 * A deposit's or withdrawal's own record (Figma Varial 4478:115461 and
 * 4478:116412): where the money went or came from, how much, its status and
 * fee, the full transaction, and a link out to stellar.expert. Opened from
 * "View transaction" on the deposit success screen, as on mobile, and from a
 * position's Activity rows.
 *
 * The amount carries no sign: the title already says which way it moved, so
 * one sheet reads the same from either entry point. The Activity rows keep
 * theirs.
 *
 * The date and the fee actually charged come from Horizon by hash: the submit
 * response carries neither. The fee reads "--" until that lands, or if it
 * fails, and so does the date unless the caller knows it. The status is always
 * Success, since only a settled transaction opens this.
 */
export const EarnDepositDetailsSheet = ({
  type = "deposit",
  amount,
  assetCode,
  assetIssuer,
  assetIcons,
  poolName,
  transactionHash,
  xdr,
  occurredAt,
  networkDetails,
  onClose,
}: EarnDepositDetailsSheetProps) => {
  const isWithdraw = type === "withdraw";
  // Deposits keep the ids they always had.
  const testIdPrefix = `earn-${type}`;
  const { t, i18n } = useTranslation();
  // What i18next actually fell back to, so the date reads in the same
  // language as the strings around it.
  const language = i18n.resolvedLanguage || i18n.language;
  const [onChain, setOnChain] = useState<{
    createdAt: string;
    feeCharged: string;
    envelopeXdr: string;
  } | null>(null);
  const [isOnDetailsPane, setIsOnDetailsPane] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    stellarSdkServer(
      networkDetails.networkUrl,
      networkDetails.networkPassphrase,
    )
      .transactions()
      .transaction(transactionHash)
      .call()
      .then((record) => {
        const isUsable =
          !Number.isNaN(Date.parse(record.created_at)) &&
          Number.isFinite(Number(record.fee_charged));
        if (isCurrent && isUsable) {
          setOnChain({
            createdAt: record.created_at,
            feeCharged: String(record.fee_charged),
            envelopeXdr: record.envelope_xdr,
          });
        }
      })
      .catch(() => {
        // Leaves the date and fee at "--"; the rest of the sheet stands.
      });
    return () => {
      isCurrent = false;
    };
  }, [transactionHash, networkDetails]);

  const envelope = xdr ?? onChain?.envelopeXdr;
  const transaction = useMemo(() => {
    if (!envelope) {
      return null;
    }
    try {
      const parsed = TransactionBuilder.fromXDR(
        envelope,
        networkDetails.networkPassphrase,
      );
      return "operations" in parsed ? (parsed as Transaction) : null;
    } catch (e) {
      return null;
    }
  }, [envelope, networkDetails.networkPassphrase]);
  const date = onChain?.createdAt ?? occurredAt;

  // Pinned under the details, like history's transaction sheet.
  const explorerButton = !isCustomNetwork(networkDetails) ? (
    <Button
      size="lg"
      variant="secondary"
      isFullWidth
      isRounded
      icon={<Icon.LinkExternal01 />}
      iconPosition="right"
      onClick={() =>
        openTab(`${getStellarExpertUrl(networkDetails)}/tx/${transactionHash}`)
      }
      data-testid={`${testIdPrefix}-details-explorer`}
    >
      {t("View on stellar.expert")}
    </Button>
  ) : undefined;

  if (isOnDetailsPane && transaction && envelope) {
    return (
      <EarnTransactionDetails
        transaction={transaction}
        xdr={envelope}
        onClose={() => setIsOnDetailsPane(false)}
        testIdPrefix={testIdPrefix}
      />
    );
  }

  return (
    <SheetLayout
      data-testid={`${testIdPrefix}-details`}
      header={
        <SheetHeader
          layout={SheetHeaderLayout.Inline}
          leading={
            <div className="EarnDepositDetailsSheet__token">
              <AssetIcon
                assetIcons={assetIcons}
                code={assetCode}
                issuerKey={assetIssuer}
              />
            </div>
          }
          title={
            isWithdraw
              ? t("Withdrew {{code}}", { code: assetCode })
              : t("Deposited {{code}}", { code: assetCode })
          }
          subtitle={date ? formatDepositDate(date, language) : NO_FIAT_VALUE}
          subtitleTestId={`${testIdPrefix}-details-date`}
          onClose={onClose}
          closeTestId={`${testIdPrefix}-details-close`}
        />
      }
      footer={explorerButton}
    >
      <div className="EarnDepositDetailsSheet__body">
        <div className="EarnDepositDetailsSheet__group">
          <StatRow
            label={isWithdraw ? t("From") : t("To")}
            testId={`${testIdPrefix}-details-pool`}
            value={
              <>
                {formatPoolName(poolName, t)}
                {/* The protocol's own name is not translated. */}
                <span className="EarnDepositDetailsSheet__protocol">
                  {" · Blend"}
                </span>
              </>
            }
          />
          <StatRow
            label={isWithdraw ? t("Withdrew") : t("Deposited")}
            testId={`${testIdPrefix}-details-amount`}
            value={`${formatEarnAmount(amount)} ${assetCode}`}
          />
        </div>

        <div className="EarnDepositDetailsSheet__group">
          <StatRow
            label={t("Status")}
            testId={`${testIdPrefix}-details-status`}
            value={t("Success")}
          />
          <StatRow
            label={t("Fee")}
            testId={`${testIdPrefix}-details-fee`}
            value={
              onChain
                ? `${stroopToXlm(onChain.feeCharged).toFixed()} XLM`
                : NO_FIAT_VALUE
            }
          />
        </div>

        {transaction && (
          <TransactionDetailsButton
            testId={`${testIdPrefix}-details-btn`}
            onClick={() => setIsOnDetailsPane(true)}
          />
        )}
      </div>
    </SheetLayout>
  );
};
