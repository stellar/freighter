import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@stellar/design-system";

import ExtensionsPin from "popup/assets/illo-pin-extension.svg";
import { Header } from "popup/components/Header";
import { FullscreenStyle } from "popup/components/FullscreenStyle";

import "./styles.scss";

export const PinExtension = () => {
  const { t } = useTranslation();

  return (
    <>
      <Header />
      <FullscreenStyle />
      <div className="PinExtension">
        <div className="PinExtension__wrapper">
          <div className="PinExtension__title">
            {t("Your Freighter install is complete")}
          </div>
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

          {/* TODO: update to use SDS v2 button with icon */}
          <Button
            onClick={() => {
              window.close();
            }}
          >
            Done, I’m ready to go!
          </Button>
        </div>
      </div>
    </>
  );
};
