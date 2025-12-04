import React from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button, Card, Text } from "@stellar/design-system";

import { SecurityLevel } from "popup/constants/blockaid";
import {
  overriddenBlockaidResponseSelector,
  setOverriddenBlockaidResponseAction,
  clearOverriddenBlockaidResponseAction,
} from "popup/ducks/settings";

import "./Debug/styles.scss";

// Only show in dev mode
const isDev = process.env.DEV_EXTENSION === "true" || !process.env.PRODUCTION;

export const Debug = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  // Always call hooks, even if we return early
  const overriddenBlockaidResponse = useSelector(
    overriddenBlockaidResponseSelector,
  );

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

  const handleSetOverride = (level: SecurityLevel) => {
    dispatch(setOverriddenBlockaidResponseAction(level));
  };

  const handleClearOverride = () => {
    dispatch(clearOverriddenBlockaidResponseAction());
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
