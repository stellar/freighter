import React from "react";
import { useTranslation } from "react-i18next";

import { Collectible } from "@shared/api/types/types";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

export const CollectibleDetail = ({
  selectedCollectible,
  handleItemClose,
}: {
  selectedCollectible: Collectible;
  collectionName: string;
  handleItemClose: () => void;
}) => {
  console.log(selectedCollectible);
  const { t } = useTranslation();
  const name =
    selectedCollectible.metadata?.name || selectedCollectible.tokenId;
  const hasBaseInfo =
    !!name || selectedCollectible.collectionName || selectedCollectible.tokenId;

  const attributes = selectedCollectible.metadata?.attributes || [];
  const hasAttributes = Array.isArray(attributes) && attributes.length > 0;

  return (
    <div className="CollectibleDetail">
      <View>
        <SubviewHeader title={name} customBackAction={handleItemClose} />
        <View.Content>
          <div className="CollectibleDetail__content">
            {selectedCollectible.metadata?.image && (
              <div className="CollectibleDetail__image">
                <img src={selectedCollectible.metadata?.image} alt={name} />
              </div>
            )}
            {hasBaseInfo && (
              <div className="CollectibleDetail__base-info CollectibleDetail__block">
                {selectedCollectible.metadata?.name && (
                  <div className="CollectibleDetail__base-info__row">
                    <div className="CollectibleDetail__block__label">
                      {t("Name")}
                    </div>
                    <div className="CollectibleDetail__block__value">
                      {name}
                    </div>
                  </div>
                )}
                {selectedCollectible.collectionName && (
                  <div className="CollectibleDetail__base-info__row">
                    <div className="CollectibleDetail__block__label">
                      {t("Collection")}
                    </div>
                    <div className="CollectibleDetail__block__value">
                      {selectedCollectible.collectionName}
                    </div>
                  </div>
                )}
                {selectedCollectible.tokenId && (
                  <div className="CollectibleDetail__base-info__row">
                    <div className="CollectibleDetail__block__label">
                      {t("Token ID")}
                    </div>
                    <div className="CollectibleDetail__block__value">
                      {selectedCollectible.tokenId}
                    </div>
                  </div>
                )}
              </div>
            )}
            {selectedCollectible.metadata?.description && (
              <div className="CollectibleDetail__description CollectibleDetail__block">
                <div className="CollectibleDetail__block__label">
                  {t("Description")}
                </div>
                <div className="CollectibleDetail__block__value">
                  {selectedCollectible.metadata?.description}
                </div>
              </div>
            )}
            {hasAttributes && (
              <div className="CollectibleDetail__attributes CollectibleDetail__block">
                <div className="CollectibleDetail__block__label">
                  {t("Collectible Traits")}
                </div>
                {attributes.map((attribute) => (
                  <div className="CollectibleDetail__attribute">
                    <div className="CollectibleDetail__attribute__trait">
                      {attribute.traitType}
                    </div>
                    <div className="CollectibleDetail__attribute__value">
                      {attribute.value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </View.Content>
      </View>
    </div>
  );
};
