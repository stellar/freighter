import React, { useState, useEffect, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";

import { Button, Card, Text } from "@stellar/design-system";
import { captureException } from "@sentry/browser";

import { isDev } from "@shared/helpers/dev";
import { SecurityLevel } from "popup/constants/blockaid";
import {
  getBlockaidOverrideState,
  saveBlockaidOverrideState,
} from "@shared/api/internal";
import {
  getDebugInfoSnapshot,
  subscribeToDebugInfo,
  getRecentEvents,
  clearRecentEvents,
  subscribeToDebugEvents,
} from "helpers/metrics";
import type { DebugEvent } from "helpers/metrics";
import { getExperimentClient } from "helpers/experimentClient";

import "./Debug/styles.scss";

// "[set]" is a technical indicator (not a natural-language word), kept as a local constant.
const STATUS_SET = "[set]";

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const AnalyticsEventRow = ({
  event,
  timestamp,
  props,
}: {
  event: string;
  timestamp: number;
  props?: DebugEvent["props"];
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="Debug__analytics-event">
      <button
        type="button"
        className="Debug__analytics-event-header"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Text as="span" size="xs" className="Debug__analytics-event-time">
          {formatTime(timestamp)}
        </Text>
        <Text as="span" size="xs" weight="medium">
          {event}
        </Text>
        <Text as="span" size="xs" className="Debug__analytics-event-chevron">
          {expanded ? "▾" : "▸"}
        </Text>
      </button>
      {expanded && props && (
        <pre className="Debug__analytics-event-props">
          {JSON.stringify(props, null, 2)}
        </pre>
      )}
    </div>
  );
};

const StatusRow = ({ label, value }: { label: string; value: string }) => (
  <div className="Debug__analytics-status-row">
    <Text as="span" size="sm" weight="medium">
      {label}:
    </Text>
    <Text as="span" size="sm">
      {value}
    </Text>
  </div>
);

const AnalyticsDebugSection = () => {
  const { t } = useTranslation();

  const debugInfo = useSyncExternalStore(
    subscribeToDebugInfo,
    getDebugInfoSnapshot,
  );

  const recentEvents = useSyncExternalStore(
    subscribeToDebugEvents,
    getRecentEvents,
  );

  return (
    <Card>
      <div className="Debug__card">
        <Text
          as="h2"
          size="md"
          weight="medium"
          className="Debug__section-title"
        >
          {t("Analytics Debug")}
        </Text>
        <Text as="p" size="sm" className="Debug__section-description">
          {t("Amplitude SDK state and recent events")}
        </Text>

        <div className="Debug__analytics-status">
          <StatusRow
            label={t("Initialized")}
            value={debugInfo.hasInitialized ? t("Yes") : t("No")}
          />
          <StatusRow
            label={t("API Key")}
            value={debugInfo.hasAmplitudeKey ? STATUS_SET : t("Not set")}
          />
          <StatusRow label={t("User ID")} value={debugInfo.userId ?? t("N/A")} />
          <StatusRow
            label={t("Sending to Amplitude")}
            value={debugInfo.isSendingToAmplitude ? t("Yes") : t("No")}
          />
        </div>

        <div className="Debug__analytics-events-header">
          <Text as="h3" size="sm" weight="medium">
            {t("Recent Events")} ({recentEvents.length})
          </Text>
          {recentEvents.length > 0 && (
            <Button variant="tertiary" size="sm" onClick={clearRecentEvents}>
              {t("Clear")}
            </Button>
          )}
        </div>

        {recentEvents.length === 0 ? (
          <Text as="p" size="sm" className="Debug__analytics-empty">
            {t("No events recorded yet. Navigate around to generate events.")}
          </Text>
        ) : (
          <div className="Debug__analytics-events-list">
            {recentEvents.map((entry, idx) => (
              <AnalyticsEventRow
                key={`${entry.timestamp}-${idx}`}
                event={entry.event}
                timestamp={entry.timestamp}
                props={entry.props}
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

const FeatureFlagsDebugSection = () => {
  const { t } = useTranslation();
  const [flags, setFlags] = useState<
    Record<string, { key?: string; value?: string; payload?: unknown }>
  >({});

  const client = getExperimentClient();
  const isActive = client !== null;

  useEffect(() => {
    if (!client) return;
    setFlags(client.all());
  }, [client]);

  const handleRefresh = async () => {
    if (!client) return;
    try {
      await client.fetch();
      setFlags(client.all());
    } catch (e) {
      console.error("[Debug] Failed to refresh flags", e);
    }
  };

  const flagEntries = Object.entries(flags);

  return (
    <Card>
      <div className="Debug__card">
        <Text
          as="h2"
          size="md"
          weight="medium"
          className="Debug__section-title"
        >
          {t("Feature Flags")}
        </Text>
        <Text as="p" size="sm" className="Debug__section-description">
          {t("Amplitude Experiment feature flags and variants")}
        </Text>

        <div className="Debug__analytics-status">
          <StatusRow
            label={t("Experiment Client")}
            value={isActive ? t("Active") : t("Not initialized")}
          />
          <StatusRow
            label={t("Flags Loaded")}
            value={String(flagEntries.length)}
          />
        </div>

        {isActive && (
          <div className="Debug__analytics-events-header">
            <Text as="h3" size="sm" weight="medium">
              {t("Current Flags")}
            </Text>
            <Button variant="tertiary" size="sm" onClick={handleRefresh}>
              {t("Refresh")}
            </Button>
          </div>
        )}

        {!isActive ? (
          <Text as="p" size="sm" className="Debug__analytics-empty">
            {t(
              "Experiment client is not initialized. Check that AMPLITUDE_EXPERIMENT_DEPLOYMENT_KEY is set.",
            )}
          </Text>
        ) : flagEntries.length === 0 ? (
          <Text as="p" size="sm" className="Debug__analytics-empty">
            {t("No feature flags loaded.")}
          </Text>
        ) : (
          <div className="Debug__analytics-events-list">
            {flagEntries.map(([key, variant]) => (
              <FeatureFlagRow key={key} flagKey={key} variant={variant} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

const FeatureFlagRow = ({
  flagKey,
  variant,
}: {
  flagKey: string;
  variant: { key?: string; value?: string; payload?: unknown };
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const hasPayload = variant.payload !== undefined && variant.payload !== null;

  return (
    <div className="Debug__analytics-event">
      <button
        type="button"
        className="Debug__analytics-event-header"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <Text as="span" size="xs" weight="medium" className="Debug__flag-key">
          {flagKey}
        </Text>
        <Text as="span" size="xs" className="Debug__flag-value">
          {variant.value ?? t("off")}
        </Text>
        {hasPayload && (
          <Text as="span" size="xs" className="Debug__analytics-event-chevron">
            {expanded ? "▾" : "▸"}
          </Text>
        )}
      </button>
      {expanded && hasPayload && (
        <pre className="Debug__analytics-event-props">
          {JSON.stringify(variant.payload, null, 2)}
        </pre>
      )}
    </div>
  );
};

export const Debug = () => {
  const { t } = useTranslation();
  const [overriddenBlockaidResponse, setOverriddenBlockaidResponse] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const saved = await getBlockaidOverrideState();
        setOverriddenBlockaidResponse(saved);
      } catch (error) {
        captureException(error);
        setOverriddenBlockaidResponse(null);
      }
    };

    loadSavedState();
  }, []);

  if (!isDev) {
    return (
      <div className="Debug">
        <h1 className="Debug__title">{t("Debug")}</h1>
        <p className="Debug__description">
          {t("Debug menu is only available in development mode.")}
        </p>
      </div>
    );
  }

  const handleSetOverride = async (level: SecurityLevel) => {
    try {
      const { overriddenBlockaidResponse: saved } =
        await saveBlockaidOverrideState({
          overriddenBlockaidResponse: level,
        });
      setOverriddenBlockaidResponse(saved);
    } catch (error) {
      captureException(error);
    }
  };

  const handleClearOverride = async () => {
    try {
      const { overriddenBlockaidResponse: saved } =
        await saveBlockaidOverrideState({
          overriddenBlockaidResponse: null,
        });
      setOverriddenBlockaidResponse(saved);
    } catch (error) {
      captureException(error);
    }
  };

  return (
    <div className="Debug">
      <h1 className="Debug__title">{t("Debug")}</h1>
      <p className="Debug__description">
        {t("Use this page for development helpers")}
      </p>

      <div className="Debug__section">
        <Card>
          <div className="Debug__card">
            <Text
              as="h2"
              size="md"
              weight="medium"
              className="Debug__section-title"
            >
              {t("Blockaid Response Override")}
            </Text>
            <Text as="p" size="sm" className="Debug__section-description">
              {t(
                "Override Blockaid security responses for testing different security states (DEV only)",
              )}
            </Text>

            {overriddenBlockaidResponse && (
              <div className="Debug__override-banner">
                <Text as="p" size="sm" className="Debug__override-banner-text">
                  {t("Overridden response")}: {overriddenBlockaidResponse}
                </Text>
              </div>
            )}

            <div className="Debug__buttons-container">
              <Button
                variant={
                  overriddenBlockaidResponse === SecurityLevel.SAFE
                    ? "primary"
                    : "secondary"
                }
                size="sm"
                onClick={() => handleSetOverride(SecurityLevel.SAFE)}
              >
                {t("Safe")}
              </Button>
              <Button
                variant={
                  overriddenBlockaidResponse === SecurityLevel.SUSPICIOUS
                    ? "primary"
                    : "secondary"
                }
                size="sm"
                onClick={() => handleSetOverride(SecurityLevel.SUSPICIOUS)}
              >
                {t("Suspicious")}
              </Button>
              <Button
                variant={
                  overriddenBlockaidResponse === SecurityLevel.MALICIOUS
                    ? "primary"
                    : "secondary"
                }
                size="sm"
                onClick={() => handleSetOverride(SecurityLevel.MALICIOUS)}
              >
                {t("Malicious")}
              </Button>
              <Button
                variant={
                  overriddenBlockaidResponse === SecurityLevel.UNABLE_TO_SCAN
                    ? "primary"
                    : "secondary"
                }
                size="sm"
                onClick={() => handleSetOverride(SecurityLevel.UNABLE_TO_SCAN)}
              >
                {t("Unable to Scan")}
              </Button>
            </div>

            {overriddenBlockaidResponse && (
              <Button
                variant="tertiary"
                size="sm"
                onClick={handleClearOverride}
              >
                {t("Clear Override")}
              </Button>
            )}
          </div>
        </Card>
      </div>

      <div className="Debug__side-by-side">
        <AnalyticsDebugSection />
        <FeatureFlagsDebugSection />
      </div>
    </div>
  );
};
