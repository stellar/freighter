import React from "react";

import ExtensionsMenu from "popup/assets/extensions-menu.png";
import ExtensionsPin from "popup/assets/extensions-pin.png";
import { Header } from "popup/components/Header";
import { FullscreenStyle } from "popup/components/FullscreenStyle";

import "./styles.scss";

export const PinExtension = () => (
  <>
    <Header />
    <FullscreenStyle />
    <div className="PinExtension">
      <div className="PinExtension__wrapper">
        <div className="PinExtension__title">
          Pin the extension in your browser to access it easily.
        </div>
        <div className="PinExtension__caption">
          1. Click on the Extensions menu in your browser
        </div>
        <div className="PinExtension__img">
          <img src={ExtensionsMenu} alt="Extensions Menu" />
        </div>
        <div className="PinExtension__caption">
          2. Find Freighter in the list of extensions and click the Pin button
        </div>
        <div className="PinExtension__img">
          <img src={ExtensionsPin} alt="Extensions Pin" />
        </div>
      </div>
    </div>
  </>
);
