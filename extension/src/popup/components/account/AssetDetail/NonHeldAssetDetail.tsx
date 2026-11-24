import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Asset } from "stellar-sdk";
import { useTranslation } from "react-i18next";
import { CopyText, Icon, Link } from "@stellar/design-system";

import { getTokenPrices } from "@shared/api/internal";
import {
  getNativeContractId,
  isNativeAssetId,
} from "@shared/helpers/assetIdentity";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";
import { useAssetDomain } from "popup/helpers/useAssetDomain";
import { isMainnet, isTestnet, truncateString } from "helpers/stellar";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "popup/basics/shadcn/Popover";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { tokenPriceHistoryEnabledSelector } from "popup/ducks/remoteConfig";
import { TokenChartSource } from "popup/components/account/TokenPriceChart/constants";

import { AssetDetailBody, AssetDetailBodyProps } from "./AssetDetailBody";
import { SwapToAction, SwapToFooter } from "./SwapToFooter";

import "./styles.scss";

export interface NonHeldAssetDescriptor {
  canonical: string; // CODE:ISSUER, native, or SYMBOL:CONTRACTID
  code: string;
  issuer?: string; // classic issuer G… or contract id C…
  contractId?: string; // set when issuer is a contract id
  name?: string;
  iconUrl?: string | null;
  domain?: string | null;
  isSuspicious?: boolean;
  isMalicious?: boolean;
  /** USD price from the search record; used when the backend has none. */
  spotPrice?: number;
}

export const NonHeldAssetDetail = ({
  asset,
  source,
  handleClose,
  swapTo,
}: {
  asset: NonHeldAssetDescriptor;
  source: TokenChartSource;
  handleClose: () => void;
  /** Renders the Swap To footer; set by the swap picker only. */
  swapTo?: SwapToAction;
}) => {
  const { t } = useTranslation();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const isChartEnabled = useSelector(tokenPriceHistoryEnabledSelector);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [price, setPrice] = useState<AssetDetailBodyProps["spotPrice"]>(null);

  const isNative = isNativeAssetId(asset.canonical);
  const classicIssuer = asset.contractId ? undefined : asset.issuer;
  // Skip the lookup when the descriptor already carries a domain.
  const { assetDomain: fetchedDomain } = useAssetDomain({
    assetIssuer: asset.domain ? undefined : classicIssuer,
  });
  const assetDomain = asset.domain || fetchedDomain;

  const { canonical } = asset;
  const { networkPassphrase } = networkDetails;
  useEffect(() => {
    const controller = new AbortController();
    setPrice(null);
    getTokenPrices([canonical], networkDetails, controller.signal)
      .then((prices) => {
        if (!controller.signal.aborted) {
          setPrice(prices[canonical] ?? null);
        }
      })
      .catch(() => {
        // A missing price renders as the body's placeholder/empty state.
      });
    return () => controller.abort();
    // networkDetails is keyed by its passphrase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canonical, networkPassphrase]);

  const isChartShown = isChartEnabled && isMainnet(networkDetails);
  const headerPrice =
    price?.currentPrice || asset.spotPrice === undefined
      ? price
      : { currentPrice: String(asset.spotPrice) };

  let copyAddress = "";
  if (asset.contractId) {
    copyAddress = asset.contractId;
  } else if (isNative) {
    copyAddress = getNativeContractId(networkPassphrase);
  } else if (asset.issuer) {
    copyAddress = new Asset(asset.code, asset.issuer).contractId(
      networkPassphrase,
    );
  }

  const isStellarExpertSupported =
    isMainnet(networkDetails) || isTestnet(networkDetails);
  const stellarExpertSlug = asset.contractId
    ? `contract/${asset.contractId}`
    : isNative
      ? "asset/native"
      : `asset/${asset.code}-${asset.issuer}`;

  const fallbackTitle =
    asset.code ||
    asset.name ||
    (asset.contractId ? truncateString(asset.contractId) : "");
  const title = isNative ? t("Stellar Lumens") : asset.name || fallbackTitle;
  return (
    <View>
      <SubviewHeader
        title={fallbackTitle}
        customBackIcon={<Icon.X />}
        customBackAction={handleClose}
        rightButton={
          <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
            <PopoverTrigger
              asChild
              className="AssetDetail__options"
              onClick={() => setOptionsOpen(true)}
            >
              <img src={IconEllipsis} alt={t("asset options")} />
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="AssetDetail__options-actions"
            >
              {copyAddress ? (
                <div className="AssetDetail__options-actions__row">
                  <CopyText textToCopy={copyAddress}>
                    <div className="action">
                      <div className="AssetDetail__options-actions__label">
                        {t("Copy address")}
                      </div>
                      <Icon.Copy01 />
                    </div>
                  </CopyText>
                </div>
              ) : null}
              {isStellarExpertSupported ? (
                <div className="AssetDetail__options-actions__row">
                  <Link
                    className="action link"
                    variant="secondary"
                    rel="noreferrer"
                    target="_blank"
                    href={`https://stellar.expert/explorer/${networkDetails.network.toLowerCase()}/${stellarExpertSlug}`}
                  >
                    <>
                      <div className="AssetDetail__options-actions__label">
                        Stellar.expert
                      </div>
                      <Icon.LinkExternal01 />
                    </>
                  </Link>
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        }
      />
      <View.Content>
        <div className="AssetDetail__wrapper" data-testid="NonHeldAssetDetail">
          <AssetDetailBody
            token={asset.canonical}
            networkDetails={networkDetails}
            source={source}
            title={title}
            iconUrl={asset.iconUrl}
            isSorobanAsset={!!asset.contractId}
            spotPrice={headerPrice}
            isPricePlaceholder={!headerPrice?.currentPrice}
            assetDomain={assetDomain}
            isChartShown={isChartShown}
            isMalicious={asset.isMalicious}
            isSuspicious={asset.isSuspicious}
          />
        </div>
      </View.Content>
      {swapTo ? (
        <SwapToFooter
          {...swapTo}
          onCancel={handleClose}
          isMalicious={asset.isMalicious}
          isSuspicious={asset.isSuspicious}
        />
      ) : null}
    </View>
  );
};
