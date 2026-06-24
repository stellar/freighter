import React from "react";
import { useTranslation } from "react-i18next";
import * as Popover from "@radix-ui/react-popover";
import { Icon } from "@stellar/design-system";

import { AssetIcon } from "popup/components/account/AccountAssets";
import { ScamAssetIcon } from "popup/components/account/ScamAssetIcon";
import { SecurityLevel } from "popup/constants/blockaid";
import { openTab } from "popup/helpers/navigate";
import { formatDomain } from "helpers/stellar";

import "./styles.scss";

export interface SwapTokenRowProps {
  code: string;
  issuerKey?: string;
  domain?: string | null;
  iconUrl?: string;
  isHeld: boolean;
  fiatValue?: string;
  percentChange24h?: string;
  securityLevel?: SecurityLevel;
  onClick: () => void;
  stellarExpertUrl: string;
}

export const SwapTokenRow = ({
  code,
  issuerKey = "",
  domain,
  iconUrl = "",
  isHeld,
  fiatValue,
  percentChange24h,
  securityLevel,
  onClick,
  stellarExpertUrl,
}: SwapTokenRowProps) => {
  const { t } = useTranslation();
  const canonical = issuerKey ? `${code}:${issuerKey}` : "native";
  const isScamAsset =
    securityLevel === SecurityLevel.MALICIOUS ||
    securityLevel === SecurityLevel.SUSPICIOUS;

  const copyAddress = async () => {
    if (!issuerKey) return;
    await navigator.clipboard.writeText(issuerKey);
  };

  const viewOnExpert = () => {
    openTab(`${stellarExpertUrl}/asset/${code}-${issuerKey}`);
  };

  return (
    <div className="SwapTokenRow" data-testid={`SwapTokenRow-${code}`}>
      <div
        className="SwapTokenRow__body"
        data-testid={`SwapTokenRow-${code}-body`}
        onClick={onClick}
      >
        <div className="SwapTokenRow__icon">
          <AssetIcon
            assetIcons={code !== "XLM" ? { [canonical]: iconUrl } : {}}
            code={code}
            issuerKey={issuerKey}
            icon={iconUrl}
            isSuspicious={false}
          />
          {!isHeld && <ScamAssetIcon isScamAsset={isScamAsset} />}
        </div>
        <div className="SwapTokenRow__title">
          <div className="SwapTokenRow__title__code">{code}</div>
          {domain ? (
            <div className="SwapTokenRow__title__domain">
              {formatDomain(domain)}
            </div>
          ) : null}
        </div>
      </div>

      {isHeld ? (
        <div className="SwapTokenRow__value">
          <div data-testid={`SwapTokenRow-${code}-fiat`}>
            {fiatValue || "--"}
          </div>
          {percentChange24h ? (
            <div
              className="SwapTokenRow__value__change"
              data-testid={`SwapTokenRow-${code}-change`}
            >
              {percentChange24h}
            </div>
          ) : null}
        </div>
      ) : (
        <Popover.Root>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="SwapTokenRow__menu"
              data-testid={`SwapTokenRow-${code}-menu`}
              aria-label={t("More options")}
              onClick={(e) => e.stopPropagation()}
            >
              <Icon.DotsHorizontal />
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="SwapTokenRow__menu__content"
              sideOffset={4}
            >
              <button
                type="button"
                className="SwapTokenRow__menu__item"
                data-testid={`SwapTokenRow-${code}-copy`}
                onClick={copyAddress}
              >
                {t("Copy address")}
              </button>
              <button
                type="button"
                className="SwapTokenRow__menu__item"
                data-testid={`SwapTokenRow-${code}-view-expert`}
                onClick={viewOnExpert}
              >
                {t("View on stellar.expert")}
              </button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </div>
  );
};
