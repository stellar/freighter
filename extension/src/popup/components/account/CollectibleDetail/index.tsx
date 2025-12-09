import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Button, Icon, Notification } from "@stellar/design-system";

import { SubviewHeader } from "popup/components/SubviewHeader";
import { Loading } from "popup/components/Loading";
import { View } from "popup/basics/layout/View";
import { openTab } from "popup/helpers/navigate";
import { getStellarExpertUrl } from "popup/helpers/account";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "popup/basics/shadcn/Popover";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { collectionsSelector } from "popup/ducks/cache";
import { useGetCollectibles } from "helpers/hooks/useGetCollectibles";

import "./styles.scss";

export interface SelectedCollectible {
  collectionAddress: string;
  tokenId: string;
}

export const CollectibleDetail = ({
  selectedCollectible,
  handleItemClose,
}: {
  selectedCollectible: SelectedCollectible;
  handleItemClose: () => void;
}) => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const collections = useSelector(collectionsSelector);
  const collectionData = collections[networkDetails?.network || ""]?.[
    publicKey || ""
  ]?.find(
    (collectionData) =>
      collectionData.collection?.address ===
      selectedCollectible.collectionAddress,
  );
  const collectible = collectionData?.collection?.collectibles?.find(
    (collectible) => collectible.tokenId === selectedCollectible.tokenId,
  );
  const { fetchData: fetchCollectibles } = useGetCollectibles({
    useCache: false,
  });
  const [isRefreshingMetadata, setIsRefreshingMetadata] = useState(false);

  if (!collectible) {
    return (
      <View>
        <Notification title={t("Error")} variant="error">
          {t("Collectible not found")}
        </Notification>
      </View>
    );
  }

  const name = collectible.metadata?.name || selectedCollectible.tokenId;

  const attributes = collectible.metadata?.attributes || [];
  const hasAttributes = Array.isArray(attributes) && attributes.length > 0;

  const stellarExpertUrl = getStellarExpertUrl(networkDetails);

  const handleRefreshMetadata = async () => {
    setIsRefreshingMetadata(true);
    await fetchCollectibles({ publicKey, networkDetails });
    setIsRefreshingMetadata(false);
  };

  return (
    <div className="CollectibleDetail" data-testid="CollectibleDetail">
      <View>
        <SubviewHeader
          title={name}
          customBackAction={handleItemClose}
          rightButton={
            <Popover>
              <div className="CollectibleDetail__header__right-button">
                <PopoverTrigger className="CollectibleDetail__header__right-button__trigger">
                  <Icon.DotsHorizontal className="CollectibleDetail__header__right-button__icon" />
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="CollectibleDetail__header__right-button__popover-content"
                >
                  <div
                    className="CollectibleDetail__header__right-button__popover-content__item"
                    onClick={handleRefreshMetadata}
                  >
                    <Icon.RefreshCcw01 className="CollectibleDetail__header__right-button__popover-content__item__icon" />
                    <div className="CollectibleDetail__header__right-button__popover-content__item__label">
                      {t("Refresh metadata")}
                    </div>
                  </div>
                  <div className="CollectibleDetail__header__right-button__popover-content__item">
                    <Icon.LinkExternal01 className="CollectibleDetail__header__right-button__popover-content__item__icon" />
                    <div
                      className="CollectibleDetail__header__right-button__popover-content__item__label"
                      onClick={() => {
                        openTab(
                          `${stellarExpertUrl}/contract/${collectible.collectionAddress}`,
                        );
                      }}
                    >
                      {t("View on stellar.expert")}
                    </div>
                  </div>
                  <div className="CollectibleDetail__header__right-button__popover-content__item">
                    <Icon.EyeOff className="CollectibleDetail__header__right-button__popover-content__item__icon" />
                    <div className="CollectibleDetail__header__right-button__popover-content__item__label">
                      {t("Hide collectible")}
                    </div>
                  </div>
                </PopoverContent>
              </div>
            </Popover>
          }
        />
        {isRefreshingMetadata ? (
          <Loading />
        ) : (
          <View.Content>
            <div className="CollectibleDetail__content">
              {collectible.metadata?.image && (
                <div
                  className="CollectibleDetail__image"
                  data-testid="CollectibleDetail__image"
                >
                  <img src={collectible.metadata?.image} alt={name} />
                </div>
              )}
              <div
                className="CollectibleDetail__base-info CollectibleDetail__block"
                data-testid="CollectibleDetail__base-info"
              >
                {collectible.metadata?.name && (
                  <div
                    className="CollectibleDetail__base-info__row"
                    data-testid="CollectibleDetail__base-info__row__name"
                  >
                    <div
                      className="CollectibleDetail__block__label"
                      data-testid="CollectibleDetail__base-info__row__name__label"
                    >
                      {t("Name")}
                    </div>
                    <div
                      className="CollectibleDetail__block__value"
                      data-testid="CollectibleDetail__base-info__row__name__value"
                    >
                      {name}
                    </div>
                  </div>
                )}
                {collectible.collectionName && (
                  <div
                    className="CollectibleDetail__base-info__row"
                    data-testid="CollectibleDetail__base-info__row__collectionName"
                  >
                    <div
                      className="CollectibleDetail__block__label"
                      data-testid="CollectibleDetail__base-info__row__collectionName__label"
                    >
                      {t("Collection")}
                    </div>
                    <div
                      className="CollectibleDetail__block__value"
                      data-testid="CollectibleDetail__base-info__row__collectionName__value"
                    >
                      {collectible.collectionName}
                    </div>
                  </div>
                )}
                {collectible.tokenId && (
                  <div
                    className="CollectibleDetail__base-info__row"
                    data-testid="CollectibleDetail__base-info__row__tokenId"
                  >
                    <div
                      className="CollectibleDetail__block__label"
                      data-testid="CollectibleDetail__base-info__row__tokenId__label"
                    >
                      {t("Token ID")}
                    </div>
                    <div
                      className="CollectibleDetail__block__value"
                      data-testid="CollectibleDetail__base-info__row__tokenId__value"
                    >
                      {collectible.tokenId}
                    </div>
                  </div>
                )}
              </div>
              {collectible.metadata?.description && (
                <div
                  className="CollectibleDetail__description CollectibleDetail__block"
                  data-testid="CollectibleDetail__description"
                >
                  <div
                    className="CollectibleDetail__block__label"
                    data-testid="CollectibleDetail__description__label"
                  >
                    {t("Description")}
                  </div>
                  <div
                    className="CollectibleDetail__block__value"
                    data-testid="CollectibleDetail__description__value"
                  >
                    {collectible.metadata?.description}
                  </div>
                </div>
              )}
              {hasAttributes && (
                <div
                  className="CollectibleDetail__attributes CollectibleDetail__block"
                  data-testid="CollectibleDetail__attributes"
                >
                  <div
                    className="CollectibleDetail__block__label"
                    data-testid="CollectibleDetail__attributes__label"
                  >
                    {t("Collectible Traits")}
                  </div>
                  <div className="CollectibleDetail__attributes__list">
                    {attributes.map((attribute) => (
                      <div
                        className="CollectibleDetail__attribute"
                        key={attribute.traitType}
                      >
                        <div
                          className="CollectibleDetail__attribute__value"
                          data-testid="CollectibleDetail__attribute__value"
                        >
                          {attribute.value}
                        </div>
                        <div
                          className="CollectibleDetail__attribute__trait"
                          data-testid="CollectibleDetail__attribute__trait"
                        >
                          {attribute.traitType}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </View.Content>
        )}
        <View.Footer>
          <div className="CollectibleDetail__footer__buttons">
            {collectible.metadata?.externalUrl && (
              <Button
                isRounded
                isFullWidth
                variant="secondary"
                size="lg"
                iconPosition="right"
                icon={
                  <Icon.LinkExternal01 className="CollectibleDetail__footer__buttons__icon" />
                }
                onClick={() => {
                  openTab(collectible.metadata?.externalUrl || "");
                }}
              >
                {t("View")}
              </Button>
            )}

            <Button isFullWidth isRounded variant="secondary" size="lg">
              {t("Send")}
            </Button>
          </div>
        </View.Footer>
      </View>
    </div>
  );
};
