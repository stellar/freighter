import React, { useEffect, useState } from "react";
import { Icon, Loader, Text } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { BalanceRow } from "popup/components/BalanceRow";
import { SlideupModal } from "popup/components/SlideupModal";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { openTab } from "popup/helpers/navigate";
import { formatAmount } from "popup/helpers/formatters";

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

/** Green pill showing the pool's headline rate for an asset. */
const ApyBadge = ({ apy, code }: { apy: number | null; code: string }) => (
  <div className="EarnTokenPicker__apy" data-testid={`earn-apy-${code}`}>
    {/* A null rate means no fresh oracle price — genuinely unknown, and
        distinct from a rate that really is zero. */}
    {apy === null ? "--" : `${formatAmount((apy * 100).toFixed(2))}%*`}
  </div>
);

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
      <View data-testid="earn-token-picker-loading">
        <SubviewHeader
          title={t("Choose Token to earn")}
          customBackAction={onClose}
          customBackIcon={<Icon.X />}
        />
        <View.Content>
          <div className="EarnTokenPicker__loader">
            <Loader size="2rem" />
          </div>
        </View.Content>
      </View>
    );
  }

  if (state.state === RequestState.ERROR) {
    return (
      <View data-testid="earn-token-picker-error">
        <SubviewHeader
          title={t("Choose Token to earn")}
          customBackAction={onClose}
          customBackIcon={<Icon.X />}
        />
        <View.Content>
          <Text as="p" size="sm">
            {t("We couldn’t load earnable tokens. Please try again.")}
          </Text>
        </View.Content>
      </View>
    );
  }

  const data = state.data as ResolvedEarnTokens;

  const renderRow = (option: EarnTokenOption, isHeld: boolean) => (
    <BalanceRow
      key={option.assetId}
      code={option.code}
      issuerKey={option.issuer}
      iconUrl={option.iconUrl}
      amount={`${formatAmount(option.total)} ${option.code}`}
      rightSlot={<ApyBadge apy={option.apy} code={option.code} />}
      onClick={() =>
        isHeld ? onSelect(option, data) : setNotEnoughToken(option)
      }
      data-testid={`earn-token-row-${option.code}`}
    />
  );

  // A zero-balance token is excluded from `hasSwappableBalance` by its own
  // canonical, but it holds none of it anyway, so the assetId is a safe stand-in
  // for a canonical we would otherwise have to resolve from the SAC.
  const notEnoughVariant = notEnoughToken
    ? getNotEnoughVariant({
        isOnrampable: isOnrampableAsset(
          notEnoughToken.code,
          data.networkDetails,
        ),
        isSwappable: hasSwappableBalance(
          data.balances.balances,
          notEnoughToken.assetId,
        ),
      })
    : null;

  return (
    <View data-testid="earn-token-picker">
      <SubviewHeader
        title={t("Choose Token to earn")}
        customBackAction={onClose}
        customBackIcon={<Icon.X />}
      />
      <View.Content
        contentFooter={
          <div className="EarnTokenPicker__disclaimer">
            <Text as="p" size="xs">
              {t(
                "*APY is an estimate based on current protocol conditions and changes with market activity. It is not guaranteed by Freighter, SDF, or the protocol.",
              )}
            </Text>
          </div>
        }
      >
        <div className="EarnTokenPicker">
          {data.held.length > 0 && (
            <>
              <div className="EarnTokenPicker__section-title">
                <Text as="div" size="md" weight="medium">
                  {t("In your account")}
                </Text>
              </div>
              {data.held.map((option) => renderRow(option, true))}
            </>
          )}

          {data.supported.length > 0 && (
            <>
              <div className="EarnTokenPicker__section-title">
                <Text as="div" size="md" weight="medium">
                  {t("Supported tokens")}
                </Text>
              </div>
              {data.supported.map((option) => renderRow(option, false))}
            </>
          )}
        </div>
      </View.Content>

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
    </View>
  );
};
