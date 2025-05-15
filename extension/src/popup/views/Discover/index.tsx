import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Icon, Text } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { Loading } from "popup/components/Loading";
import { DiscoverData } from "@shared/api/types";

import { RequestState, useGetDiscoverData } from "./hooks/useGetDiscoverData";
import "./styles.scss";

export const Discover = () => {
  const { t } = useTranslation();
  const { state: discoverData, fetchData } = useGetDiscoverData();

  useEffect(() => {
    const getData = async () => {
      await fetchData();
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { state, data } = discoverData;
  const isLoading =
    state === RequestState.IDLE || state === RequestState.LOADING;
  let allowedDiscoverRows = [] as DiscoverData;

  if (isLoading) {
    return <Loading />;
  }

  if (state !== RequestState.ERROR) {
    allowedDiscoverRows = data.discoverData.filter((row) => !row.isBlacklisted);
  }

  return (
    <>
      <SubviewHeader title={t("Discover")} />
      <View.Content hasNoTopPadding>
        <div className="Discover__eyebrow">
          <Icon.Stars03 />
          <Text as="div" size="sm" weight="medium">
            {t("Dapps")}
          </Text>
        </div>
        <div className="Discover__content" data-testid="discover-content">
          {allowedDiscoverRows.length ? (
            allowedDiscoverRows.map((row) => (
              <div
                className="Discover__row"
                key={row.name}
                data-testid="discover-row"
              >
                <img
                  src={row.iconUrl}
                  alt={row.name}
                  className="Discover__row__icon"
                />
                <div className="Discover__row__label">
                  <Text as="div" size="sm" weight="medium">
                    {row.name}
                  </Text>
                  <div className="Discover__row__label__subtitle">
                    <Text as="div" size="xs" weight="medium">
                      {row.tags.join(", ")}
                    </Text>
                  </div>
                </div>
                <a
                  href={row.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="Discover__row__button"
                  data-testid="discover-row-button"
                >
                  <Text as="div" size="sm" weight="semi-bold">
                    {t("Open")}
                  </Text>
                  <div className="Discover__row__button__icon">
                    <Icon.LinkExternal01 />
                  </div>
                </a>
              </div>
            ))
          ) : (
            <div className="Discover__row" key="no-data">
              <Text as="div" size="sm" weight="medium">
                {t("There are no sites to display at this moment.")}
              </Text>
            </div>
          )}
          {allowedDiscoverRows.length ? (
            <div className="Discover__footer">
              <div className="Discover__footer__copy">
                {t(
                  "Freighter provides access to third-party dApps, protocols, and tokens for informational purposes only. Freighter does not endorse any listed items.",
                )}
              </div>
              <div className="Discover__footer__copy">
                {t(
                  "By using these services, you act at your own risk, and Freighter or Stellar Development Foundation (SDF) bears no liability for any resulting losses or damages.",
                )}
              </div>
            </div>
          ) : null}
        </div>
      </View.Content>
    </>
  );
};
