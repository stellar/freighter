import React from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon } from "@stellar/design-system";

import ExtensionsPin from "popup/assets/illo-pin-extension.svg";
import { SubmitButtonWrapper } from "popup/basics/Forms";
import { Onboarding, OnboardingHeader } from "popup/components/Onboarding";

import "./styles.scss";
import { View } from "popup/basics/layout/View";

export const PinExtension = () => {
  const { t } = useTranslation();

  return (
    <React.Fragment>
      <View.Header />
      <View.Content alignment="center">
        <Onboarding layout="full" customWidth="31rem">
          <OnboardingHeader>
            {t("Your Freighter install is complete")}
          </OnboardingHeader>
          <div className="PinExtension">
            <div className="PinExtension__wrapper">
              <div className="PinExtension__caption">
                <div>
                  1.{" "}
                  {t(
                    "Click on the extensions button at the top of your browser’s bar",
                  )}
                </div>
                <div>
                  2.{" "}
                  {t(
                    "Click on Freighter’s pin button to have it always visible",
                  )}
                </div>
              </div>
              <div className="PinExtension__img">
                <img src={ExtensionsPin} alt="Extensions Pin" />
              </div>
              <SubmitButtonWrapper isCenterAligned>
                <Button
                  variant="tertiary"
                  size="md"
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
        </Onboarding>
      </View.Content>
    </React.Fragment>
  );
};
