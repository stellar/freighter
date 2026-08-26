import React, { useEffect, useState } from "react";
import { Icon, Loader, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import BlendLogo from "popup/assets/blend-logo.svg";
import EarnGlow from "popup/assets/earn-glow.svg";
import { BalanceRow } from "popup/components/BalanceRow";
import { SlideupModal } from "popup/components/SlideupModal";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { openTab } from "popup/helpers/navigate";
import { NO_FIAT_VALUE, formatAmount } from "popup/helpers/formatters";
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
        : t("{{rate}}% APY", {
            rate: formatAmount((apy * 100).toFixed(2)),
          })}
    </div>
  );
};

/**
 * The screen's chrome: close affordance, protocol badge and title. Shared by
 * the loading and error states so neither shifts the header when the list
 * resolves.
 */
const PickerShell = ({
  onClose,
  children,
  contentFooter,
  "data-testid": dataTestId,
}: {
  onClose: () => void;
  children: React.ReactNode;
  contentFooter?: React.ReactNode;
  "data-testid": string;
}) => {
  const { t } = useTranslation();

  return (
    <div className="EarnTokenPicker" data-testid={dataTestId}>
      <img className="EarnTokenPicker__glow" src={EarnGlow} alt="" />

      <div className="EarnTokenPicker__header">
        <button
          type="button"
          className="EarnTokenPicker__close"
          onClick={onClose}
          aria-label={t("Close")}
          data-testid="earn-token-picker-close"
        >
          <Icon.XClose />
        </button>
      </div>

      <div className="EarnTokenPicker__content">
        <div className="EarnTokenPicker__intro">
          {/* Not translated: the protocol's own name. */}
          <div className="EarnTokenPicker__protocol">
            <img
              className="EarnTokenPicker__protocol-icon"
              src={BlendLogo}
              alt=""
            />
            <Text as="div" size="md" weight="medium">
              Blend
            </Text>
          </div>

          <div className="EarnTokenPicker__copy">
            <Text as="h1" size="lg" weight="medium">
              {t("Choose an asset")}
            </Text>
            <div className="EarnTokenPicker__subtitle">
              <Text as="p" size="sm" weight="regular">
                {t("Supply assets to Blend and earn variable yield.")}
              </Text>
            </div>
          </div>
        </div>

        {children}
      </div>

      {contentFooter}
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
      window.close();
    }
    return <Navigate to={state.data.routeTarget} replace />;
  }

  const isLoading =
    state.state === RequestState.IDLE || state.state === RequestState.LOADING;

  if (isLoading) {
    return (
      <PickerShell onClose={onClose} data-testid="earn-token-picker-loading">
        <div className="EarnTokenPicker__loader">
          <Loader size="2rem" />
        </div>
      </PickerShell>
    );
  }

  if (state.state === RequestState.ERROR) {
    return (
      <PickerShell onClose={onClose} data-testid="earn-token-picker-error">
        <Text as="p" size="sm">
          {t("We couldn’t load earnable tokens. Please try again.")}
        </Text>
      </PickerShell>
    );
  }

  const data = state.data as ResolvedEarnTokens;

  // A zero-balance token is excluded from `hasSwappableBalance` by its own
  // canonical, but it holds none of it anyway, so the assetId is a safe stand-in
  // for a canonical we would otherwise have to resolve from the SAC.
  const resolveNotEnoughVariant = (option: EarnTokenOption) =>
    getNotEnoughVariant({
      isOnrampable: isOnrampableAsset(option.code, data.networkDetails),
      isSwappable: hasSwappableBalance(data.balances.balances, option.assetId),
    });

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
      <div className="EarnTokenPicker__section-title">
        <Text as="div" size="md" weight="medium">
          {title}
        </Text>
      </div>
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
        data-testid="earn-token-picker"
        contentFooter={
          <div className="EarnTokenPicker__disclaimer">
            <Text as="p" size="sm" weight="regular">
              {t("APY may change based on protocol conditions.")}
            </Text>
          </div>
        }
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
            renderSection(
              // Nothing is held, so there is no "other" to be other than.
              hasHeld ? t("Other supported assets") : t("Supported tokens"),
              data.supported,
              false,
            )}
        </div>
      </PickerShell>

      <SlideupModal
        isModalOpen={Boolean(notEnoughToken)}
        setIsModalOpen={(isOpen) => {
          if (!isOpen) {
            setNotEnoughToken(null);
          }
        }}
        hasBackdrop
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
