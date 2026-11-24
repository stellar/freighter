import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import LogoVarial from "popup/assets/logo-varial.svg?react";

import "./styles.scss";

// Matches the exit animation in styles.scss.
export const STATUS_EXIT_MS = 150;

export type OnboardingStatusType = "importing" | "ready";

// Full-screen brand mark with one line of text. Import shows "importing"
// then "ready"; create goes straight to "ready". "ready" is the last
// onboarding screen: the user closes the tab from here.
//
// While mounted, a status change only swaps the text: the old line fades
// out, then the new one fades in.
export const OnboardingStatus = ({
  status,
}: {
  status: OnboardingStatusType;
}) => {
  const { t } = useTranslation();
  const text =
    status === "ready"
      ? t("Your wallet is ready!")
      : t("Importing your wallet…");
  const [shownText, setShownText] = useState(text);
  const isLeaving = shownText !== text;

  useEffect(() => {
    if (!isLeaving) {
      return undefined;
    }
    const timer = setTimeout(() => setShownText(text), STATUS_EXIT_MS);
    return () => clearTimeout(timer);
  }, [isLeaving, text]);

  return (
    <View.Content alignment="center" hasNoTopPadding hasNoBottomPadding>
      <div
        className="OnboardingStatus"
        data-testid="onboarding-status"
        data-status={status}
      >
        <LogoVarial className="OnboardingStatus__logo" aria-hidden="true" />
        <div role="status">
          <Text
            as="p"
            size="lg"
            weight="medium"
            key={shownText}
            addlClassName={
              isLeaving
                ? "OnboardingStatus__text OnboardingStatus__text--leaving"
                : "OnboardingStatus__text"
            }
          >
            {shownText}
          </Text>
        </div>
      </div>
    </View.Content>
  );
};
