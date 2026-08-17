import React, { useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import { Button, Loader, Notification, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { AmountCard } from "popup/components/amount/AmountCard";
import { PercentageButtons } from "popup/components/amount/PercentageButtons";
import {
  buildFiatLineText,
  getAmountFontSizeClass,
} from "popup/components/amount/helpers/amountDisplay";
import { SlideupModal } from "popup/components/SlideupModal";
import { PoolDetailsSheet } from "popup/components/earn/PoolDetailsSheet";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { openTab } from "popup/helpers/navigate";
import { getAssetFromCanonical, isMainnet } from "helpers/stellar";
import {
  cleanAmount,
  formatAmount,
  roundUsdValue,
} from "popup/helpers/formatters";
import { getAssetDecimals, getAvailableBalance } from "popup/helpers/soroban";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import {
  saveAmount,
  saveSimulation,
  transactionDataSelector,
} from "popup/ducks/transactionSubmission";
import { buildAndSimulateBlendDeposit } from "popup/helpers/blendDeposit";
import { earnSelector, setEarnSubmitFailed } from "popup/ducks/earn";

import { PoolCard } from "./PoolCard";
import { NetworkFeeSheet } from "./NetworkFeeSheet";
import {
  getEarnCtaState,
  getMaxDepositAmount,
  needsXlmForFee,
} from "./helpers/earnCtaState";
import {
  ResolvedEarnAmount,
  useGetEarnAmountData,
} from "./hooks/useGetEarnAmountData";

import "./styles.scss";

const DEFAULT_AMOUNT = "0";

interface EarnAmountProps {
  goBack: () => void;
  /**
   * Fired once the deposit has been built and simulated successfully. The
   * prepared XDR is in redux (`transactionSimulation`) by the time this runs.
   */
  onSimulated: () => void;
}

export const EarnAmount = ({ goBack, onSimulated }: EarnAmountProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { state, fetchData } = useGetEarnAmountData();
  const { asset, amount, destination, transactionTimeout } = useSelector(
    transactionDataSelector,
  );
  const { pool, selectedAssetApy, lastSubmitFailed } =
    useSelector(earnSelector);
  const { recommendedFee } = useNetworkFees();

  const [isPoolSheetOpen, setIsPoolSheetOpen] = useState(false);
  const [isFeeSheetOpen, setIsFeeSheetOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState("");

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.data?.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      window.close();
    }
    return <Navigate to={state.data.routeTarget} replace />;
  }

  const isLoading =
    state.state === RequestState.IDLE || state.state === RequestState.LOADING;

  if (isLoading || state.state === RequestState.ERROR) {
    return (
      <View data-testid="earn-amount-loading">
        <SubviewHeader title={t("Deposit")} customBackAction={goBack} />
        <View.Content>
          <div className="EarnAmount__loader">
            {isLoading ? (
              <Loader size="2rem" />
            ) : (
              <Text as="p" size="sm">
                {t("We couldn’t load your balances. Please try again.")}
              </Text>
            )}
          </div>
        </View.Content>
      </View>
    );
  }

  const data = state.data as ResolvedEarnAmount;
  const selected = asset ? getAssetFromCanonical(asset) : null;
  const decimals = getAssetDecimals(asset, data.balances, true);

  const assetPrice = data.tokenPrices[asset]?.currentPrice;
  const priceValueUsd = assetPrice
    ? formatAmount(
        roundUsdValue(
          new BigNumber(assetPrice)
            .multipliedBy(new BigNumber(cleanAmount(amount || "0")))
            .toString(),
        ),
      )
    : null;

  // Nets out the base reserve and the inclusion fee. The resource fee is far
  // larger for a Blend submit and is handled by getMaxDepositAmount's buffer.
  const availableBalance = asset
    ? getAvailableBalance({
        assetCanonical: asset,
        balances: data.balances.balances,
        recommendedFee,
      })
    : "0";

  const isXlm = asset === "native";
  const maxDepositable = getMaxDepositAmount({
    availableBalance,
    isXlm,
  });

  const enteredAmount = new BigNumber(cleanAmount(amount || "0"));
  const isAmountTooHigh = enteredAmount.gt(new BigNumber(maxDepositable));
  const cta = getEarnCtaState({
    availableBalanceIsZero: new BigNumber(maxDepositable).lte(0),
    amountIsZero: enteredAmount.lte(0),
    isAmountTooHigh,
  });

  const ctaLabel = {
    enter: t("Enter an amount"),
    insufficient: t("Insufficient funds"),
    review: t("Review deposit"),
  }[cta.labelKey];

  const spendableXlm = getAvailableBalance({
    assetCanonical: "native",
    balances: data.balances.balances,
    recommendedFee,
  });

  const handleContinue = async () => {
    // Clear a previous failure so the banner does not persist into a retry the
    // user has already corrected.
    dispatch(setEarnSubmitFailed(false));
    setSimulationError("");

    // Checked after the CTA gate, so an unaffordable XLM deposit reads as
    // "Insufficient funds" rather than as a missing-fee problem.
    if (needsXlmForFee({ spendableXlm, fee: recommendedFee })) {
      setIsFeeSheetOpen(true);
      return;
    }

    setIsSimulating(true);
    try {
      const { preparedTransaction, simulationResponse } =
        await buildAndSimulateBlendDeposit({
          publicKey: data.publicKey,
          assetId: destination,
          amount,
          decimals,
          networkDetails: data.networkDetails,
          transactionFee: recommendedFee,
          transactionTimeout,
        });

      dispatch(
        saveSimulation({
          preparedTransaction,
          response: simulationResponse,
        }),
      );
      onSimulated();
    } catch (error) {
      // Surface the pool's own rejection (supply cap, frozen pool, stale
      // oracle) rather than a generic failure — it is the only signal the user
      // gets about why this deposit will not go through.
      setSimulationError(
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <View data-testid="earn-amount">
      <SubviewHeader title={t("Deposit")} customBackAction={goBack} />
      <View.Content
        contentFooter={
          <Button
            size="lg"
            isFullWidth
            isRounded
            variant="secondary"
            disabled={cta.disabled || isSimulating}
            isLoading={isSimulating}
            onClick={handleContinue}
            data-testid="earn-amount-btn-continue"
          >
            {ctaLabel}
          </Button>
        }
      >
        <div className="EarnAmount">
          {(lastSubmitFailed || simulationError) && (
            <div
              className="EarnAmount__error"
              data-testid="earn-amount-fail-banner"
            >
              <Notification
                variant="error"
                title={simulationError || t("Transaction failed. Try again.")}
              />
            </div>
          )}

          <AmountCard
            label={t("You deposit")}
            availableBalanceText={t("{{amount}} {{code}} available", {
              amount: formatAmount(availableBalance),
              code: selected?.code || "",
            })}
            availableBalanceFontSizePx={12}
            // Fiat entry is not offered here: the deposit is denominated in the
            // pool's asset, so a fiat-first input would only add rounding.
            inputType="crypto"
            supportsUsd={false}
            hasUsdPrice={Boolean(assetPrice)}
            amount={amount === DEFAULT_AMOUNT ? "" : amount}
            amountUsd=""
            amountFontSizeClass={getAmountFontSizeClass(amount)}
            assetCode={selected?.code || ""}
            assetIcons={{}}
            assetIssuerKey={selected?.issuer}
            fiatLineText={buildFiatLineText({
              hasAsset: Boolean(asset),
              inputType: "crypto",
              price: assetPrice,
              priceUsd: priceValueUsd,
              cryptoAmount: amount,
              code: selected?.code || "",
            })}
            isAmountTooHigh={isAmountTooHigh}
            maxSpendableText={formatAmount(maxDepositable)}
            cryptoDecimals={decimals}
            onAmountChange={({ amount: next }) =>
              dispatch(saveAmount(next === "" ? DEFAULT_AMOUNT : next))
            }
            onAmountUsdChange={() => {}}
            onToggleInputType={() => {}}
            // The asset is fixed once chosen; changing it means going back to
            // the picker, where the pool's rate for it is also re-read.
            onSelectAsset={goBack}
          />

          {pool && (
            <PoolCard
              poolName={pool.name}
              apy={selectedAssetApy}
              onOpenDetails={() => setIsPoolSheetOpen(true)}
            />
          )}

          <PercentageButtons
            onSelect={(pct) =>
              dispatch(
                saveAmount(
                  new BigNumber(maxDepositable)
                    .multipliedBy(pct)
                    .decimalPlaces(decimals, BigNumber.ROUND_DOWN)
                    .toFixed(),
                ),
              )
            }
          />
        </div>
      </View.Content>

      <SlideupModal
        isModalOpen={isPoolSheetOpen}
        setIsModalOpen={setIsPoolSheetOpen}
        hasBackdrop
      >
        {pool ? (
          <PoolDetailsSheet
            pool={pool}
            onClose={() => setIsPoolSheetOpen(false)}
          />
        ) : (
          <div />
        )}
      </SlideupModal>

      <SlideupModal
        isModalOpen={isFeeSheetOpen}
        setIsModalOpen={setIsFeeSheetOpen}
        hasBackdrop
      >
        <NetworkFeeSheet
          canBuyXlm={isMainnet(data.networkDetails)}
          onClose={() => setIsFeeSheetOpen(false)}
        />
      </SlideupModal>
    </View>
  );
};
