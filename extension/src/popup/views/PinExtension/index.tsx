import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon } from "@stellar/design-system";

import ExtensionsPin from "popup/assets/illo-pin-extension.svg";
import { SubmitButtonWrapper } from "popup/basics/Forms";
import { Header } from "popup/components/Header";
import { FullscreenStyle } from "popup/components/FullscreenStyle";
import { OnboardingHeader } from "popup/components/Onboarding";

import "./styles.scss";

export const PinExtension = () => {
  const { t } = useTranslation();

  return (
    <>
      <Header />
      <FullscreenStyle />
      <div className="PinExtension">
        <div className="PinExtension__wrapper">
          <OnboardingHeader className="FullscreenSuccessMessage__header">
            {t("Your Freighter install is complete")}
          </OnboardingHeader>
          <div className="PinExtension__caption">
            <div>
              1.{" "}
              {t(
                "Click on the extensions button at the top of your browser’s bar",
              )}
            </div>
            <div>
              2.{" "}
              {t("Click on Freighter’s pin button to have it always visible")}
            </div>
          </div>
          <div className="PinExtension__img">
            <img src={ExtensionsPin} alt="Extensions Pin" />
          </div>
          <SubmitButtonWrapper>
            <Button
              variant="primary"
              size="md"
              isFullWidth
              onClick={() => {
                window.close();
              }}
              icon={<Icon.ArrowRight />}
              iconPosition="right"
            >
              Done, I’m ready to go!
            </Button>
          </SubmitButtonWrapper>
        </div>
      </div>
    </>
  );
};
