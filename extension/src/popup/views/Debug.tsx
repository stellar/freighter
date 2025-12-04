import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, Text } from "@stellar/design-system";
import { captureException } from "@sentry/browser";

import { SecurityLevel } from "popup/constants/blockaid";
import { getDebugOverride, saveDebugOverride } from "@shared/api/internal";

import "./Debug/styles.scss";

// Only show in dev mode
const isDev = process.env.DEV_EXTENSION === "true" || !process.env.PRODUCTION;

export const Debug = () => {
  const { t } = useTranslation();
  const [overriddenBlockaidResponse, setOverriddenBlockaidResponse] = useState<
    string | null
  >(null);

  useEffect(() => {
    const loadSavedState = async () => {
      try {
        const saved = await getDebugOverride();
        setOverriddenBlockaidResponse(saved);
      } catch (error) {
        captureException(error);
        setOverriddenBlockaidResponse(null);
      }
    };

    if (isDev) {
      loadSavedState();
    }
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
    console.log("[Debug] handleSetOverride called with:", level);
    console.log("[Debug] isDev:", isDev);
    try {
      console.log("[Debug] Calling saveDebugOverride with:", {
        overriddenBlockaidResponse: level,
      });
      const { overriddenBlockaidResponse: saved } = await saveDebugOverride({
        overriddenBlockaidResponse: level,
      });
      console.log("[Debug] saveDebugOverride returned:", saved);
      setOverriddenBlockaidResponse(saved);
      console.log("[Debug] State updated to:", saved);
    } catch (error) {
      console.error("[Debug] Error in handleSetOverride:", error);
      captureException(error);
    }
  };

  const handleClearOverride = async () => {
    console.log("[Debug] handleClearOverride called");
    console.log("[Debug] isDev:", isDev);
    try {
      console.log("[Debug] Calling saveDebugOverride with null");
      const { overriddenBlockaidResponse: saved } = await saveDebugOverride({
        overriddenBlockaidResponse: null,
      });
      console.log("[Debug] saveDebugOverride returned:", saved);
      setOverriddenBlockaidResponse(saved);
      console.log("[Debug] State updated to:", saved);
    } catch (error) {
      console.error("[Debug] Error in handleClearOverride:", error);
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
    </div>
  );
};
