import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import SimpleBar from "simplebar-react";

import { ROUTES } from "popup/constants/routes";
import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";
import { Button } from "popup/basics/buttons/Button";

import { isActiveNetwork } from "helpers/stellar";
import { navigateTo } from "popup/helpers/navigate";

import {
  settingsNetworkDetailsSelector,
  settingsNetworksListSelector,
} from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";

import { NETWORK_INDEX_SEARCH_PARAM } from "../NetworkForm";

import "./styles.scss";

export const NetworkSettings = () => {
  const networksList = useSelector(settingsNetworksListSelector);
  const activeNetworkDetails = useSelector(settingsNetworkDetailsSelector);
  const { t } = useTranslation();

  return (
    <div className="NetworkSettings">
      <SubviewHeader title={t("Network Settings")} />
      <div className="NetworkSettings__header">{t("Network")}</div>
      <SimpleBar className="NetworkSettings__scrollbar">
        <ListNavLinkWrapper>
          {networksList.map((network, i) => {
            const isActive = isActiveNetwork(activeNetworkDetails, network);

            return (
              <ListNavLink
                key={network.networkName}
                href={ROUTES.editNetwork}
                searchParams={`?${NETWORK_INDEX_SEARCH_PARAM}=${i}`}
              >
                <div key={network.networkName}>
                  <div
                    className={`NetworkSettings__name ${
                      isActive ? "NetworkSettings__name--active" : ""
                    }`}
                  >
                    {isActive ? (
                      <div className="NetworkSettings__active-marker"></div>
                    ) : null}
                    <NetworkIcon index={i} />
                    <div>{network.networkName}</div>
                  </div>
                  <div className="NetworkSettings__url">
                    {network.networkUrl}
                  </div>
                </div>
              </ListNavLink>
            );
          })}
        </ListNavLinkWrapper>
      </SimpleBar>
      <div className="NetworkSettings__bottom">
        <Button
          fullWidth
          variant={Button.variant.tertiary}
          onClick={() => navigateTo(ROUTES.addNetwork)}
        >
          {t("Add custom network")}
        </Button>
      </div>
    </div>
  );
};
