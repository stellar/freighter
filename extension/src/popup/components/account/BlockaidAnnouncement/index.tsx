import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button, Icon, Text } from "@stellar/design-system";

import { AppDispatch } from "popup/App";

import { LoadingBackground } from "popup/basics/LoadingBackground";
import {
  settingsSelector,
  saveIsBlockaidAnnounced,
} from "popup/ducks/settings";
import { openTab } from "popup/helpers/navigate";

import BlockaidLogo from "popup/assets/blockaid-logo.svg";

import "./styles.scss";

export const BlockaidAnnouncement = () => {
  const { t } = useTranslation();
  const dispatch: AppDispatch = useDispatch();
  const { isBlockaidAnnounced } = useSelector(settingsSelector);

  const handleLearnMore = () => {
    openTab("https://blockaid.io");
  };

  const handleCloseModal = () => {
    dispatch(saveIsBlockaidAnnounced({ isBlockaidAnnounced: true }));
  };

  return isBlockaidAnnounced ? null : (
    <>
      <LoadingBackground isActive />
      <div className="BlockaidAnnouncement">
        <div className="BlockaidAnnouncement__modal">
          <div className="BlockaidAnnouncement__modal__title">
            <div>{t("Freighter is adding a new layer of protection")}</div>
            <div className="BlockaidAnnouncement__modal__close">
              <Icon.XClose onClick={handleCloseModal} />
            </div>
          </div>
          <div className="BlockaidAnnouncement__modal__image">
            <img src={BlockaidLogo} alt="Blockaid Logo" />
          </div>
          <div className="BlockaidAnnouncement__modal__description">
            <Text as="p" size="sm">
              {t("Freighter now uses Blockaid to keep your accounts safer.")}
            </Text>
            <Text as="p" size="sm">
              {t("By default it will verify")}:
            </Text>
          </div>
          <div className="BlockaidAnnouncement__modal__list">
            <ul>
              <li>{t("The domains you interact with")}</li>
              <li>{t("The assets you interact with")}</li>
              <li>{t("The accounts you interact with")}</li>
              <li>
                {t(
                  "The operations and functions executed in transactions and smart contracts",
                )}
              </li>
            </ul>
          </div>

          <div className="BlockaidAnnouncement__modal__buttons">
            <Button
              size="md"
              isFullWidth
              variant="secondary"
              type="button"
              onClick={handleLearnMore}
              icon={<Icon.Link01 />}
              iconPosition="right"
            >
              {t("Learn more")}
            </Button>
            <Button
              data-testid="BlockaidAnnouncement__accept"
              size="md"
              variant="primary"
              isFullWidth
              type="button"
              onClick={handleCloseModal}
            >
              {t("Got it")}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
