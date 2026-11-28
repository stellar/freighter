import React, { useEffect, useRef, useState } from "react";
import { Button } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { ActionStatus } from "@shared/api/types";
import { View } from "popup/basics/layout/View";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";
import { formatEarnAmount } from "popup/components/earn/helpers/formatEarnAmount";
import { EarnDepositDetailsSheet } from "popup/components/earn/EarnDepositDetailsSheet";
import { SlideupModal } from "popup/components/SlideupModal";
import { TransactionStatus } from "popup/components/TransactionStatus";
import { RequestState } from "constants/request";
import { getAssetFromCanonical } from "helpers/stellar";
import { cleanAmount } from "popup/helpers/formatters";
import {
  hardwareWalletTypeSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";
import { earnSelector } from "popup/ducks/earn";
import { iconsSelector } from "popup/ducks/cache";
import { emitScreenViewed } from "helpers/metrics";
import { trackEarnDepositDismissed } from "popup/metrics/earn";

import { useSubmitEarnTxData } from "./hooks/useSubmitEarnTxData";

import "./styles.scss";

interface EarnSubmitProps {
  /** Prepared, simulated deposit XDR. */
  xdr: string;
  /** Dismisses the flow — used by both Close (in flight) and Done (settled). */
  onExit: () => void;
}

/**
 * The deposit's terminal screen: "Deposit in progress" while in flight,
 * "Deposit complete" once it settles. One component, two states — the same shape SendingTransaction
 * uses for Sending/Sent.
 *
 * Close is offered while in flight because a Soroban submission can outlast the
 * user's patience. It abandons the *screen*, not the deposit: the envelope has
 * already been submitted and nothing cancels it, so the submit hook's
 * continuation — which outlives this component — still reports the outcome. What
 * Close gives up is watching it, which is what `trackEarnDepositDismissed`
 * records.
 */
export const EarnSubmit = ({ xdr, onExit }: EarnSubmitProps) => {
  const { t } = useTranslation();
  const submission = useSelector(transactionSubmissionSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const {
    pool,
    selectedAssetApy,
    didSwapInFlow,
    lastSubmitFailed,
    reviewedAmount,
  } = useSelector(earnSelector);
  const cachedIcons = useSelector(iconsSelector);

  const { amount: fieldAmount, asset } = submission.transactionData;
  // The amount Review showed and Confirm signed. The field is only a fallback:
  // it is stored as typed ("1,000") and can differ from the signed amount.
  const amount = reviewedAmount ?? cleanAmount(fieldAmount);
  const srcAsset = getAssetFromCanonical(asset);
  const transactionHash = submission.response?.hash;

  const { state: submissionState, fetchData } = useSubmitEarnTxData({
    publicKey,
    networkDetails,
    xdr,
    isHardwareWallet: !!hardwareWalletType,
    asset,
    amount,
    assetCode: srcAsset.code,
    poolId: pool?.id || "",
    apy: selectedAssetApy,
    viaSwap: didSwapInFlow,
  });

  const isSuccess =
    submissionState.state === RequestState.SUCCESS &&
    submission.submitStatus !== ActionStatus.ERROR;
  const isLoading = !isSuccess;

  const hasEmittedSuccessView = useRef(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  useEffect(() => {
    // A failed deposit drops this step and returns to the amount screen (the
    // Earn view's submitStatus effect). Should anything remount this component
    // while that failure still stands, submitting would replay the envelope the
    // network just rejected — so refuse. A real retry runs through
    // EarnAmount's handleContinue, which clears the flag first.
    if (lastSubmitFailed) {
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Two screens in the funnel, not one: this component is "Depositing" and then
  // "Deposited!", and only it can see the transition. The Earn view's step
  // effect therefore has no entry for DEPOSIT_CONFIRM.
  useEffect(() => {
    emitScreenViewed("earn_processing", { flow: "earn", step: "processing" });
  }, []);

  useEffect(() => {
    if (!isSuccess || hasEmittedSuccessView.current) {
      return;
    }
    hasEmittedSuccessView.current = true;
    emitScreenViewed("earn_success", { flow: "earn", step: "success" });
  }, [isSuccess]);

  return (
    <View data-testid="earn-submit">
      <View.Content
        contentFooter={
          <div className="EarnSubmit__footer">
            {isLoading && (
              <>
                <div className="EarnSubmit__footer-note">
                  {/* Same string Send and Swap use — reusing the key keeps the
                      copy consistent and avoids a second translation. */}
                  {t(
                    "You can close this screen, your transaction should be complete in less than a minute.",
                  )}
                </div>
                <Button
                  size="lg"
                  isFullWidth
                  isRounded
                  variant="tertiary"
                  onClick={() => {
                    // A UX signal, not an outcome — the deposit is in flight and
                    // useSubmitEarnTxData still emits its completed/failed event
                    // from a closure this unmount does not touch. Only closing
                    // the popup outright loses the outcome.
                    trackEarnDepositDismissed({
                      assetCode: srcAsset.code,
                      poolId: pool?.id || "",
                    });
                    onExit();
                  }}
                  data-testid="earn-submit-close"
                >
                  {t("Close")}
                </Button>
              </>
            )}

            {/* Opens the deposit's own record, as on mobile; stellar.expert is
                one tap further, from there. */}
            {isSuccess && transactionHash && (
              <Button
                size="lg"
                isFullWidth
                isRounded
                variant="tertiary"
                onClick={() => setIsDetailsOpen(true)}
                data-testid="earn-submit-view-tx"
              >
                {t("View transaction")}
              </Button>
            )}

            {isSuccess && (
              <Button
                size="lg"
                isFullWidth
                isRounded
                variant="secondary"
                onClick={onExit}
                data-testid="earn-submit-done"
              >
                {t("Done")}
              </Button>
            )}
          </div>
        }
      >
        <div className="EarnSubmit">
          <TransactionStatus
            isPending={isLoading}
            title={isLoading ? t("Deposit in progress") : t("Deposit complete")}
            fromIcon={
              // The cached icon map rather than an empty one, which AssetIcon
              // reads as a lookup in flight. Warm by the time the flow reaches
              // here: the deposited asset is held, so the picker and amount
              // screens have both resolved it.
              <AssetIcon
                assetIcons={cachedIcons}
                code={srcAsset.code}
                issuerKey={srcAsset.issuer}
              />
            }
            toIcon={<PoolIcon />}
            amount={`${formatEarnAmount(amount)} ${srcAsset.code}`}
            verb={t("to")}
            target={formatPoolName(pool?.name, t)}
            captionTestId="earn-submit-caption"
          />
        </div>
      </View.Content>

      <SlideupModal
        isModalOpen={isDetailsOpen}
        setIsModalOpen={setIsDetailsOpen}
        ariaLabel={t("Deposited {{code}}", { code: srcAsset.code })}
      >
        {isDetailsOpen && transactionHash ? (
          <EarnDepositDetailsSheet
            amount={amount}
            assetCode={srcAsset.code}
            assetIssuer={srcAsset.issuer}
            assetIcons={cachedIcons}
            pool={pool}
            transactionHash={transactionHash}
            xdr={xdr}
            networkDetails={networkDetails}
            onClose={() => setIsDetailsOpen(false)}
          />
        ) : (
          <></>
        )}
      </SlideupModal>
    </View>
  );
};
