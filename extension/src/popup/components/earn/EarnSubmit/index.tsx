import React, { useEffect } from "react";
import { Button, Icon, Loader, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import { ActionStatus } from "@shared/api/types";
import { View } from "popup/basics/layout/View";
import { AssetIcon } from "popup/components/account/AccountAssets";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { HardwareSign } from "popup/components/hardwareConnect/HardwareSign";
import { RequestState } from "constants/request";
import { getAssetFromCanonical } from "helpers/stellar";
import { isCustomNetwork } from "@shared/helpers/stellar";
import { formatAmount } from "popup/helpers/formatters";
import { getStellarExpertUrl } from "popup/helpers/account";
import { openTab } from "popup/helpers/navigate";
import {
  hardwareWalletTypeSelector,
  publicKeySelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import {
  ShowOverlayStatus,
  transactionSubmissionSelector,
} from "popup/ducks/transactionSubmission";
import { earnSelector } from "popup/ducks/earn";
import { iconsSelector } from "popup/ducks/cache";

import { useSubmitEarnTxData } from "./hooks/useSubmitEarnTxData";

import "./styles.scss";

interface EarnSubmitProps {
  /** Prepared, simulated deposit XDR. */
  xdr: string;
  /** Dismisses the flow — used by both Close (in flight) and Done (settled). */
  onExit: () => void;
}

/**
 * The deposit's terminal screen: "Depositing" while in flight, "Deposited!"
 * once it settles. One component, two states — the same shape SendingTransaction
 * uses for Sending/Sent.
 *
 * Close is offered while in flight because a Soroban submission can outlast the
 * popup. The result is deliberately not tracked afterwards: the outcome shows up
 * in the refreshed balances and in history, and following it would mean owning
 * an in-flight submission outside the popup, which nothing does today.
 */
export const EarnSubmit = ({ xdr, onExit }: EarnSubmitProps) => {
  const { t } = useTranslation();
  const submission = useSelector(transactionSubmissionSelector);
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const hardwareWalletType = useSelector(hardwareWalletTypeSelector);
  const { pool } = useSelector(earnSelector);
  const cachedIcons = useSelector(iconsSelector);

  const { amount, asset } = submission.transactionData;
  const srcAsset = getAssetFromCanonical(asset);
  const transactionHash = submission.response?.hash;

  const { state: submissionState, fetchData } = useSubmitEarnTxData({
    publicKey,
    networkDetails,
    xdr,
    isHardwareWallet: !!hardwareWalletType,
    assetCode: srcAsset.code,
  });

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    submission.hardwareWalletData?.status === ShowOverlayStatus.IN_PROGRESS &&
    hardwareWalletType
  ) {
    return (
      <HardwareSign
        isInternal
        walletType={hardwareWalletType}
        onSubmit={fetchData}
      />
    );
  }

  const isSuccess =
    submissionState.state === RequestState.SUCCESS &&
    submission.submitStatus !== ActionStatus.ERROR;
  const isLoading = !isSuccess;

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
                  onClick={onExit}
                  data-testid="earn-submit-close"
                >
                  {t("Close")}
                </Button>
              </>
            )}

            {isSuccess &&
              !isCustomNetwork(networkDetails) &&
              transactionHash && (
                <Button
                  size="lg"
                  isFullWidth
                  isRounded
                  variant="tertiary"
                  onClick={() =>
                    openTab(
                      `${getStellarExpertUrl(networkDetails)}/tx/${transactionHash}`,
                    )
                  }
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
          <div className="EarnSubmit__title">
            {isLoading ? (
              <>
                <Loader size="2rem" />
                <span>{t("Depositing")}</span>
              </>
            ) : (
              <>
                <Icon.CheckCircle className="EarnSubmit__title-success" />
                <span>{t("Deposited!")}</span>
              </>
            )}
          </div>

          <div className="EarnSubmit__summary">
            <div className="EarnSubmit__icons">
              {/* The cached icon map rather than an empty one, which AssetIcon
                  reads as a lookup in flight. Warm by the time the flow reaches
                  here: the deposited asset is held, so the picker and amount
                  screens have both resolved it. */}
              <AssetIcon
                assetIcons={cachedIcons}
                code={srcAsset.code}
                issuerKey={srcAsset.issuer}
              />
              <Icon.ChevronRightDouble />
              <PoolIcon />
            </div>
            <Text as="div" size="sm">
              {t("{{amount}} {{code}} to {{pool}}", {
                amount: formatAmount(amount),
                code: srcAsset.code,
                pool: pool?.name || t("Blend pool"),
              })}
            </Text>
          </div>
        </div>
      </View.Content>
    </View>
  );
};
