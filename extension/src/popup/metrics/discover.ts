import { emitMetric } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";

/** Strip query parameters and fragments from a URL to avoid leaking
 *  sensitive data (tokens, session IDs) to the analytics backend.
 *  This is not a big risk right now on extension as we only allow
 *  known protocols that come from our backend but we include this
 *  function for future-proofing and also to match mobile behavior.
 */
export const stripQueryParams = (url: string): string => {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return url.split(/[?#]/)[0];
  }
};

export const DISCOVER_SOURCE = {
  TRENDING_CAROUSEL: "trending_carousel",
  RECENT_LIST: "recent_list",
  DAPPS_LIST: "dapps_list",
  EXPANDED_RECENT_LIST: "expanded_recent_list",
  EXPANDED_DAPPS_LIST: "expanded_dapps_list",
} as const;

export type DiscoverSource =
  (typeof DISCOVER_SOURCE)[keyof typeof DISCOVER_SOURCE];

export const trackDiscoverProtocolOpened = (
  protocolName: string,
  url: string,
  source: DiscoverSource,
): void => {
  emitMetric(METRIC_NAMES.discoverProtocolOpened, {
    url: stripQueryParams(url),
    protocolName,
    source,
    // We currently only allow known protocols in the Discover view for extension,
    // but this field is included for future-proofing in case we later expand to
    // allowing unknown protocols (e.g. from a search bar like we have on mobile).
    isKnownProtocol: true,
  });
};

export const trackDiscoverProtocolDetailsViewed = (
  protocolName: string,
  tags: string[],
): void => {
  emitMetric(METRIC_NAMES.discoverProtocolDetailsViewed, {
    protocolName,
    tags,
  });
};

export const trackDiscoverProtocolOpenedFromDetails = (
  protocolName: string,
  url: string,
): void => {
  emitMetric(METRIC_NAMES.discoverProtocolOpenedFromDetails, {
    protocolName,
    url: stripQueryParams(url),
  });
};

export const trackDiscoverViewed = (): void => {
  emitMetric(METRIC_NAMES.viewDiscover);
};

export const trackDiscoverWelcomeModalViewed = (): void => {
  emitMetric(METRIC_NAMES.discoverWelcomeModalViewed);
};
