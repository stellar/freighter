import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { AssetIcons } from "@shared/api/types";
import { AssetType } from "@shared/api/types/account-balance";
import { SwapRoute } from "@shared/api/types/backend-api";
import { NetworkDetails } from "@shared/constants/stellar";
import { AssetIcon } from "popup/components/account/AccountAssets";
import {
  SheetHeader,
  SheetHeaderAction,
  SheetHeaderLayout,
} from "popup/components/SheetHeader";
import { SheetLayout } from "popup/components/SheetLayout";
import { calculateSwapRate } from "popup/components/InternalTransaction/ReviewTransaction/helpers/calculateSwapRate";
import {
  buildRouteView,
  MAX_PATH_VENUE_ICONS,
  RouteToken,
  RouteVenue,
  RouteView,
} from "./routeViewModel";
import { useRouteSources } from "./useRouteSources";

import "./styles.scss";

enum Pane {
  Details = "details",
  Route = "route",
}

export const VenueIcon = ({ venue }: { venue: RouteVenue }) => {
  // /protocols icon URLs go stale; a failed load falls back like a missing
  // one. Keyed by URL so another venue rendered in this slot still loads.
  const [failedIcon, setFailedIcon] = useState<string | null>(null);
  return venue.icon && venue.icon !== failedIcon ? (
    <img
      className="SwapDetails__venue-icon"
      src={venue.icon}
      alt={venue.name}
      data-testid="SwapDetails__venue-icon"
      onError={() => setFailedIcon(venue.icon)}
    />
  ) : (
    <span
      className="SwapDetails__venue-icon SwapDetails__venue-icon--generic"
      aria-label={venue.name}
      data-testid="SwapDetails__venue-icon-generic"
    >
      <Icon.Route />
    </span>
  );
};

const TokenLabel = ({ token }: { token: RouteToken }) => (
  <span className="SwapDetails__token">
    <AssetIcon
      assetIcons={{ [token.canonical]: token.icon }}
      code={token.code}
      issuerKey={token.issuer}
      icon={token.icon}
      isMalicious={false}
    />
    <span className="SwapDetails__token-code">{token.code}</span>
  </span>
);

const VenueStack = ({ venues }: { venues: RouteVenue[] }) => {
  const shown = venues.slice(0, MAX_PATH_VENUE_ICONS);
  const extra = venues.length - shown.length;
  return (
    <span className="SwapDetails__venue-stack">
      {shown.map((venue, i) => (
        <VenueIcon key={`${venue.name}-${i}`} venue={venue} />
      ))}
      {extra > 0 ? (
        <span className="SwapDetails__venue-extra">{`+${extra}`}</span>
      ) : null}
    </span>
  );
};

const RoutePane = ({ view }: { view: RouteView }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<number | null>(null);
  const pathCount = view.paths.length;

  return (
    <div className="SwapDetails" data-testid="SwapRoute">
      <div className="SwapDetails__card SwapDetails__card--flush">
        <div className="SwapDetails__route-head">
          <div className="SwapDetails__route-pair">
            <TokenLabel token={view.from} />
            <Icon.ArrowRight />
            <TokenLabel token={view.to} />
          </div>
          <div
            className="SwapDetails__muted"
            data-testid="SwapRoute__path-count"
          >
            {pathCount === 1
              ? t("1 path")
              : t("Split across {{pathCount}} paths", { pathCount })}
          </div>
        </div>
        {view.paths.map((path, i) => {
          const isOpen = expanded === i;
          return (
            <div className="SwapDetails__path" key={i}>
              <button
                type="button"
                className="SwapDetails__path-row"
                data-testid={`SwapRoute__path-${i}`}
                aria-expanded={isOpen}
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                {path.share ? (
                  <span className="SwapDetails__share">{path.share}</span>
                ) : null}
                <VenueStack venues={path.venues} />
                <span className="SwapDetails__path-end">
                  {path.poolCount !== null ? (
                    <span data-testid={`SwapRoute__pools-${i}`}>
                      {t("{{count}} pools", { count: path.poolCount })}
                    </span>
                  ) : null}
                  {isOpen ? <Icon.ChevronUp /> : <Icon.ChevronDown />}
                </span>
              </button>
              {isOpen ? (
                <div
                  className="SwapDetails__hops"
                  data-testid={`SwapRoute__hops-${i}`}
                >
                  {path.tokens.map((token, j) => (
                    <React.Fragment key={j}>
                      <TokenLabel token={token} />
                      {path.venues[j] ? (
                        <div className="SwapDetails__hop-venue">
                          <VenueIcon venue={path.venues[j]} />
                          <span>{path.venues[j].name}</span>
                        </div>
                      ) : null}
                    </React.Fragment>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="SwapDetails__note">
        {t(
          "Routes may be split across multiple hops to optimize rates and fees.",
        )}
      </div>
      <div className="SwapDetails__providers">
        <div className="SwapDetails__muted">{t("Providers")}</div>
        <div className="SwapDetails__chips" data-testid="SwapRoute__providers">
          {view.providers.map((venue) => (
            <span className="SwapDetails__chip" key={venue.name}>
              <VenueIcon venue={venue} />
              {venue.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

interface SwapDetailsSheetProps {
  route: SwapRoute | null | undefined;
  fee: string;
  /** "$0.22"; omitted when XLM has no price. */
  feeFiat?: string;
  /** The sold and bought tokens as the screen shows them, keyed by backend asset ID. */
  knownTokens: Record<string, RouteToken>;
  srcCode: string;
  dstCode: string;
  sendAmount: string;
  destinationAmount: string;
  icons: AssetIcons;
  balances: AssetType[];
  networkDetails: NetworkDetails;
  onClose: () => void;
}

export const SwapDetailsSheet = ({
  route,
  fee,
  feeFiat,
  knownTokens,
  srcCode,
  dstCode,
  sendAmount,
  destinationAmount,
  icons,
  balances,
  networkDetails,
  onClose,
}: SwapDetailsSheetProps) => {
  const { t } = useTranslation();
  const [pane, setPane] = useState(Pane.Details);
  const { protocols, tokenLists, cachedIcons } =
    useRouteSources(networkDetails);
  const view = buildRouteView({
    route,
    protocols,
    tokenContext: {
      known: knownTokens,
      icons: { ...cachedIcons, ...icons },
      balances,
      tokenLists,
    },
  });

  if (pane === Pane.Route && view) {
    return (
      <SheetLayout
        data-testid="SwapDetailsSheet"
        header={
          <SheetHeader
            layout={SheetHeaderLayout.Centered}
            title={t("Route")}
            leading={
              <SheetHeaderAction
                onClick={() => setPane(Pane.Details)}
                aria-label={t("Back")}
                data-testid="SwapRoute__back"
              >
                <Icon.ArrowLeft />
              </SheetHeaderAction>
            }
            onClose={onClose}
            closeTestId="SwapRoute__close"
          />
        }
      >
        <RoutePane view={view} />
      </SheetLayout>
    );
  }

  const rate = calculateSwapRate({ sendAmount, destinationAmount });

  return (
    <SheetLayout
      data-testid="SwapDetailsSheet"
      header={
        <SheetHeader
          layout={SheetHeaderLayout.Centered}
          title={t("Details")}
          onClose={onClose}
          closeTestId="SwapDetails__close"
        />
      }
    >
      <div className="SwapDetails" data-testid="SwapDetails">
        <div className="SwapDetails__card">
          <div className="SwapDetails__row">
            <span className="SwapDetails__label">{t("Network fee")}</span>
            <span className="SwapDetails__value" data-testid="SwapDetails__fee">
              {`${fee} XLM`}
              {feeFiat ? (
                <span className="SwapDetails__muted">{` (${feeFiat})`}</span>
              ) : null}
            </span>
          </div>
        </div>
        {route?.resourceFee ? (
          <div className="SwapDetails__note">
            {t("Fees description soroban")}
          </div>
        ) : null}
        <div className="SwapDetails__card">
          <div className="SwapDetails__row">
            <span className="SwapDetails__label">{t("Swap details rate")}</span>
            <span
              className="SwapDetails__value"
              data-testid="SwapDetails__rate"
            >{`1 ${srcCode} ≈ ${rate} ${dstCode}`}</span>
          </div>
          {view ? (
            <button
              type="button"
              className="SwapDetails__row SwapDetails__row--button"
              data-testid="SwapDetails__route"
              onClick={() => setPane(Pane.Route)}
            >
              <span className="SwapDetails__label">{t("Route")}</span>
              <span className="SwapDetails__value">
                {t("{{count}} providers", {
                  count: view.providers.length,
                })}
                <VenueStack venues={view.providers} />
                <Icon.ChevronRight />
              </span>
            </button>
          ) : null}
        </div>
        <div className="SwapDetails__note">
          {t(
            "Best route selected based on rates and fees. Quote may update as market conditions change.",
          )}
        </div>
      </div>
    </SheetLayout>
  );
};
