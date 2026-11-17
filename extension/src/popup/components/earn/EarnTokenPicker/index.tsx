import React, { useEffect, useState } from "react";
import { Icon, Loader, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { BlendCatalogPool } from "@shared/api/types/blend";
import { BLEND_LENDING_DOCS_URL } from "popup/constants/externalLinks";
import { PoolIcon } from "popup/components/earn/PoolIcon";
import { formatPoolName } from "popup/components/earn/helpers/formatPoolName";
import { BalanceRow } from "popup/components/BalanceRow";
import { SlideupModal } from "popup/components/SlideupModal";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { closeWindow, openTab } from "popup/helpers/navigate";
import { NO_FIAT_VALUE, formatAmount } from "popup/helpers/formatters";
import { useNetworkFees } from "popup/helpers/useNetworkFees";
import { getSwapTotalFee } from "popup/components/swap/SwapAmount/hooks/useSimulateSwapData";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { trackEarnBalanceInsufficientShown } from "popup/metrics/earn";

import { NotEnoughTokenSheet } from "./NotEnoughTokenSheet";
import {
  getNotEnoughVariant,
  hasSwappableBalance,
  isOnrampableAsset,
} from "./helpers/getNotEnoughVariant";
import {
  EarnTokenOption,
  ResolvedEarnTokens,
  useGetEarnTokensData,
} from "./hooks/useGetEarnTokensData";

import "./styles.scss";

interface EarnTokenPickerProps {
  onClose: () => void;
  /** A token the account holds — proceeds to the amount screen. */
  onSelect: (option: EarnTokenOption, resolved: ResolvedEarnTokens) => void;
  /** The user chose to swap into a token they hold none of. */
  onSwapRequested: (
    option: EarnTokenOption,
    resolved: ResolvedEarnTokens,
  ) => void;
  /** Bumped by the caller after a swap so the list re-fetches its balances. */
  refreshKey?: number;
}

/** Solid green pill showing the pool's headline rate for an asset. */
const ApyBadge = ({ apy, code }: { apy: number | null; code: string }) => {
  const { t } = useTranslation();

  return (
    <div className="EarnTokenPicker__apy" data-testid={`earn-apy-${code}`}>
      {/* A null rate means no fresh oracle price — genuinely unknown, and
          distinct from a rate that really is zero. */}
      {apy === null
        ? NO_FIAT_VALUE
        : t("{{rate}}% APY*", {
            rate: formatAmount((apy * 100).toFixed(2)),
          })}
    </div>
  );
};

/**
 * The screen's chrome: the close affordance, the title and the "Deposit into"
 * chip. Shared by the loading and error states so neither shifts the layout
 * when the list resolves.
 */
const PickerShell = ({
  onClose,
  pool,
  children,
  "data-testid": dataTestId,
}: {
  onClose: () => void;
  /** Names the pool on the chip; just the protocol until the catalog loads. */
  pool: BlendCatalogPool | null;
  children: React.ReactNode;
  "data-testid": string;
}) => {
  const { t } = useTranslation();

  return (
    <div className="EarnTokenPicker" data-testid={dataTestId}>
      <div className="EarnTokenPicker__header">
        <button
          type="button"
          className="EarnTokenPicker__close"
          onClick={onClose}
          aria-label={t("Close")}
          data-testid="earn-token-picker-close"
        >
          <Icon.X />
        </button>
      </div>

      <div className="EarnTokenPicker__content">
        <div className="EarnTokenPicker__copy">
          <h1 className="EarnTokenPicker__title">{t("Choose a token")}</h1>
          <div className="EarnTokenPicker__subtitle">
            {t("Select a token to deposit and earn yield.")}
          </div>
        </div>

        <div className="EarnTokenPicker__deposit-into">
          <div className="EarnTokenPicker__label">{t("Deposit into")}</div>
          {/* Opens Blend's lending docs, as on mobile. The protocol's own
              name is not translated. */}
          <button
            type="button"
            className="EarnTokenPicker__protocol"
            onClick={() => openTab(BLEND_LENDING_DOCS_URL)}
            data-testid="earn-protocol-chip"
          >
            <PoolIcon size={16} />
            <span className="EarnTokenPicker__protocol-name">
              {pool ? `Blend · ${formatPoolName(pool.name, t)}` : "Blend"}
            </span>
            <Icon.LinkExternal01 />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

export const EarnTokenPicker = ({
  onClose,
  onSelect,
  onSwapRequested,
  refreshKey = 0,
}: EarnTokenPickerProps) => {
  const { t } = useTranslation();
  const { state, fetchData } = useGetEarnTokensData();
  const { recommendedFee } = useNetworkFees();
  const [notEnoughToken, setNotEnoughToken] = useState<EarnTokenOption | null>(
    null,
  );

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // Onboarding guard, matching SwapAsset: a half-onboarded account gets sent
  // back to where it left off rather than shown an empty picker.
  if (state.data?.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      closeWindow();
    }
    return <Navigate to={state.data.routeTarget} replace />;
  }

  const isLoading =
    state.state === RequestState.IDLE || state.state === RequestState.LOADING;

  if (isLoading) {
    return (
      <PickerShell
        onClose={onClose}
        pool={null}
        data-testid="earn-token-picker-loading"
      >
        <div className="EarnTokenPicker__loader">
          <Loader size="2rem" />
        </div>
      </PickerShell>
    );
  }

  if (state.state === RequestState.ERROR) {
    return (
      <PickerShell
        onClose={onClose}
        pool={null}
        data-testid="earn-token-picker-error"
      >
        <Text as="p" size="sm">
          {t("We couldn’t load earnable tokens. Please try again.")}
        </Text>
      </PickerShell>
    );
  }

  const data = state.data as ResolvedEarnTokens;

  const resolveNotEnoughVariant = (option: EarnTokenOption) => {
    // Swapping into a token the account has no trustline for opens one first,
    // in the same transaction: a second operation for the fee, and another base
    // reserve of XLM.
    const requiresTrustline = !option.hasTrustline;
    return getNotEnoughVariant({
      isOnrampable: isOnrampableAsset(option.code, data.networkDetails),
      isSwappable: hasSwappableBalance({
        balances: data.balances.balances,
        // A token without an issuer here is one the account holds none of, so
        // it has no balance of its own to exclude.
        targetCanonical: option.issuer
          ? getCanonicalFromAsset(option.code, option.issuer)
          : "",
        transactionFee: getSwapTotalFee({
          recommendedFee,
          opCount: requiresTrustline ? 2 : 1,
        }),
        requiresTrustline,
      }),
    });
  };

  const openNotEnoughSheet = (option: EarnTokenOption) => {
    // The same resolver the sheet renders from, so the reported variant can
    // never disagree with the buttons the user was actually shown.
    trackEarnBalanceInsufficientShown({
      assetCode: option.code,
      variant: resolveNotEnoughVariant(option),
    });
    setNotEnoughToken(option);
  };

  const renderRow = (option: EarnTokenOption, isHeld: boolean) => (
    <BalanceRow
      key={option.assetId}
      code={option.code}
      issuerKey={option.issuer}
      iconUrl={option.iconUrl}
      amount={`${formatAmount(option.total)} ${option.code}`}
      rightSlot={<ApyBadge apy={option.apy} code={option.code} />}
      onClick={() =>
        isHeld ? onSelect(option, data) : openNotEnoughSheet(option)
      }
      data-testid={`earn-token-row-${option.code}`}
    />
  );

  const renderSection = (
    title: string,
    options: EarnTokenOption[],
    isHeld: boolean,
  ) => (
    <div className="EarnTokenPicker__section">
      <h2 className="EarnTokenPicker__section-title">{title}</h2>
      <div className="EarnTokenPicker__rows">
        {options.map((option) => renderRow(option, isHeld))}
      </div>
    </div>
  );

  const notEnoughVariant = notEnoughToken
    ? resolveNotEnoughVariant(notEnoughToken)
    : null;

  const hasHeld = data.held.length > 0;

  return (
    <>
      <PickerShell
        onClose={onClose}
        pool={data.pool}
        data-testid="earn-token-picker"
      >
        <div className="EarnTokenPicker__sections">
          {hasHeld ? (
            renderSection(t("In your wallet"), data.held, true)
          ) : (
            <div
              className="EarnTokenPicker__empty"
              data-testid="earn-token-empty"
            >
              <Text as="div" size="md" weight="medium">
                {t("No supported assets in your wallet")}
              </Text>
              <div className="EarnTokenPicker__empty-body">
                <Text as="p" size="sm" weight="regular">
                  {t("Add a supported asset to start earning.")}
                </Text>
              </div>
            </div>
          )}
          {data.supported.length > 0 &&
            renderSection(t("Supported tokens"), data.supported, false)}
        </div>

        {/* Pairs with the asterisk on each rate. */}
        <div className="EarnTokenPicker__disclaimer">
          {t("*APY is variable and subject to change.")}
        </div>
      </PickerShell>

      <SlideupModal
        isModalOpen={Boolean(notEnoughToken)}
        setIsModalOpen={(isOpen) => {
          if (!isOpen) {
            setNotEnoughToken(null);
          }
        }}
        ariaLabel={
          notEnoughToken
            ? t("Not enough {{code}}", { code: notEnoughToken.code })
            : undefined
        }
      >
        {notEnoughToken && notEnoughVariant ? (
          <NotEnoughTokenSheet
            option={notEnoughToken}
            variant={notEnoughVariant}
            onClose={() => setNotEnoughToken(null)}
            onSwap={() => {
              const option = notEnoughToken;
              setNotEnoughToken(null);
              onSwapRequested(option, data);
            }}
          />
        ) : (
          <div />
        )}
      </SlideupModal>
    </>
  );
};
