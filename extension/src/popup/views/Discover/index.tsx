import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Icon, Text } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { Loading } from "popup/components/Loading";

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
  const discoverRowsData = data?.discoverData || [];
  const allowedDiscoverRows = discoverRowsData.filter(
    (row) => !row.isBlacklisted,
  );

  if (isLoading) {
    return <Loading />;
  }

  return (
    <>
      <SubviewHeader title={t("Discover")} />
      <View.Content hasNoTopPadding>
        <div className="Discover__eyebrow">
          <Icon.Stars03 />
          <Text as="div" size="sm" weight="medium">
            {t("Popular Sites")}
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
        </div>
      </View.Content>
    </>
  );
};
