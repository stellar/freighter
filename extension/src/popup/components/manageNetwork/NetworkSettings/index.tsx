import React from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import SimpleBar from "simplebar-react";

import { ROUTES } from "popup/constants/routes";
import { ListNavLink, ListNavLinkWrapper } from "popup/basics/ListNavLink";

import { settingsNetworksListSelector } from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";

import { NETWORK_INDEX_SEARCH_PARAM } from "../NetworkForm";

import "./styles.scss";

export const NetworkSettings = () => {
  const networksList = useSelector(settingsNetworksListSelector);
  const { t } = useTranslation();

  return (
    <div className="NetworkSettings">
      <SubviewHeader title={t("Network Settings")} />
      <div className="NetworkSettings__header">{t("Network")}</div>
      <SimpleBar
        className="NetworkSettings_scrollbar"
        style={{
          maxHeight: "30rem",
        }}
      >
        <ListNavLinkWrapper>
          {networksList.map(({ networkName, networkUrl }, i) => (
            <ListNavLink
              href={ROUTES.editNetwork}
              searchParams={`?${NETWORK_INDEX_SEARCH_PARAM}=${i}`}
            >
              <div key={networkName}>
                {networkName} {networkUrl}
              </div>
            </ListNavLink>
          ))}
        </ListNavLinkWrapper>
      </SimpleBar>
    </div>
  );
};
