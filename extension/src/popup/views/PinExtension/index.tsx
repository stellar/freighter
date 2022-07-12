import React from "react";
import { useTranslation } from "react-i18next";

import ExtensionsMenu from "popup/assets/extensions-menu.png";
import ExtensionsPin from "popup/assets/extensions-pin.png";
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
            {t("Pin the extension in your browser to access it easily.")}
          </div>
          <div className="PinExtension__caption">
            1.{" "}
            {t(
              "Click on the extensions button at the top of your browser’s bar",
            )}
          </div>
          <div className="PinExtension__img">
            <img src={ExtensionsMenu} alt="Extensions Menu" />
          </div>
          <div className="PinExtension__caption">
            2. {t("Click on Freighter’s pin button to have it always visible")}
          </div>
          <div className="PinExtension__img">
            <img src={ExtensionsPin} alt="Extensions Pin" />
          </div>
        </div>
      </div>
    </>
  );
};
