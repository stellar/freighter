import React, { useEffect, useMemo, useState } from "react";
import { Button, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Transaction, TransactionBuilder } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { BlendCatalogPool } from "@shared/api/types/blend";
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

interface EarnDepositDetailsSheetProps {
  /** The deposited amount, unformatted. */
  amount: string;
  assetCode: string;
  assetIssuer?: string;
  assetIcons: AssetIcons;
  pool: BlendCatalogPool | null;
  transactionHash: string;
  /** The submitted envelope, decoded for "Transaction details". */
  xdr: string;
  networkDetails: NetworkDetails;
  onClose: () => void;
}

/**
 * The deposit's own record, opened from "View transaction" on the success
 * screen, as on mobile: where it went, how much, its status and fee, the full
 * transaction, and a link out to stellar.expert.
 *
 * The date and the fee actually charged come from Horizon by hash: the submit
 * response carries neither. Both read "--" until that lands, or if it fails.
 * The status is always Success, since only a settled deposit opens this.
 */
export const EarnDepositDetailsSheet = ({
  amount,
  assetCode,
  assetIssuer,
  assetIcons,
  pool,
  transactionHash,
  xdr,
  networkDetails,
  onClose,
}: EarnDepositDetailsSheetProps) => {
  const { t, i18n } = useTranslation();
  // What i18next actually fell back to, so the date reads in the same
  // language as the strings around it.
  const language = i18n.resolvedLanguage || i18n.language;
  const [onChain, setOnChain] = useState<{
    createdAt: string;
    feeCharged: string;
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

  const transaction = useMemo(() => {
    try {
      const parsed = TransactionBuilder.fromXDR(
        xdr,
        networkDetails.networkPassphrase,
      );
      return "operations" in parsed ? (parsed as Transaction) : null;
    } catch (e) {
      return null;
    }
  }, [xdr, networkDetails.networkPassphrase]);

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
      data-testid="earn-deposit-details-explorer"
    >
      {t("View on stellar.expert")}
    </Button>
  ) : undefined;

  if (isOnDetailsPane && transaction) {
    return (
      <EarnTransactionDetails
        transaction={transaction}
        xdr={xdr}
        onClose={() => setIsOnDetailsPane(false)}
        testIdPrefix="earn-deposit"
      />
    );
  }

  return (
    <SheetLayout
      data-testid="earn-deposit-details"
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
          title={t("Deposited {{code}}", { code: assetCode })}
          subtitle={
            onChain
              ? formatDepositDate(onChain.createdAt, language)
              : NO_FIAT_VALUE
          }
          subtitleTestId="earn-deposit-details-date"
          onClose={onClose}
          closeTestId="earn-deposit-details-close"
        />
      }
      footer={explorerButton}
    >
      <div className="EarnDepositDetailsSheet__body">
        <div className="EarnDepositDetailsSheet__group">
          <StatRow
            label={t("To")}
            testId="earn-deposit-details-pool"
            value={
              <>
                {formatPoolName(pool?.name, t)}
                {/* The protocol's own name is not translated. */}
                <span className="EarnDepositDetailsSheet__protocol">
                  {" · Blend"}
                </span>
              </>
            }
          />
          <StatRow
            label={t("Deposited")}
            testId="earn-deposit-details-amount"
            value={`-${formatEarnAmount(amount)} ${assetCode}`}
          />
        </div>

        <div className="EarnDepositDetailsSheet__group">
          <StatRow
            label={t("Status")}
            testId="earn-deposit-details-status"
            value={t("Success")}
          />
          <StatRow
            label={t("Fee")}
            testId="earn-deposit-details-fee"
            value={
              onChain
                ? `${stroopToXlm(onChain.feeCharged).toFixed()} XLM`
                : NO_FIAT_VALUE
            }
          />
        </div>

        {transaction && (
          <TransactionDetailsButton
            testId="earn-deposit-details-btn"
            onClick={() => setIsOnDetailsPane(true)}
          />
        )}
      </div>
    </SheetLayout>
  );
};
