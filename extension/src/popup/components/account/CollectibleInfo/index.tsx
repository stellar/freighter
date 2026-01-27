import React from "react";
import { useTranslation } from "react-i18next";
import classnames from "classnames";

import "./styles.scss";
import { Icon } from "@stellar/design-system";

/*
  This file contains shared components for displaying collectible information.
  The following helpers and componenets are used to make sure we consistently display collectible information across the app
  using the same styles and fallback values for when metadata is not available.
*/

export const getCollectibleName = (
  name: string | undefined,
  tokenId: string,
) => {
  // if the name is not defined in the metadata, use the token id to generate a name
  return name || `Token #${tokenId}`;
};

export const CollectibleInfoBlock = ({
  className,
  children,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  props?: React.HTMLAttributes<HTMLDivElement>;
}) => (
  <div className={classnames("CollectibleInfo__block", className)} {...props}>
    {children}
  </div>
);

export const CollectibleInfoImage = ({
  image,
  name,
  isSmall = false,
  isHistory = false,
}: {
  image: string | undefined;
  name: string;
  isSmall?: boolean;
  isHistory?: boolean;
}) => {
  return image ? (
    <div
      className={classnames("CollectibleInfo__image", {
        "CollectibleInfo__image--small": isSmall,
        "CollectibleInfo__image--history": isHistory,
      })}
    >
      <img data-testid="account-collectible-image" src={image} alt={name} />
    </div>
  ) : (
    <div
      className={classnames("CollectibleInfo__image__placeholder", {
        "CollectibleInfo__image__placeholder--small": isSmall,
        "CollectibleInfo__image__placeholder--history": isHistory,
      })}
      data-testid="account-collectible-placeholder"
    >
      <Icon.Image01 />
    </div>
  );
};

export const CollectibleInfo = ({
  name,
  collectionName,
  tokenId,
  image,
  dataTestIdBase,
}: {
  name: string;
  collectionName: string;
  tokenId: string;
  image?: string;
  dataTestIdBase: string;
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div
        className="CollectibleInfo__image"
        data-testid={`${dataTestIdBase}__image`}
      >
        <CollectibleInfoImage image={image} name={name} />
      </div>
      <CollectibleInfoBlock
        className="CollectibleInfo__base-info"
        data-testid={`${dataTestIdBase}__base-info`}
      >
        {name && (
          <div
            className="CollectibleInfo__base-info__row"
            data-testid={`${dataTestIdBase}__base-info__row__name`}
          >
            <div
              className="CollectibleInfo__block__label"
              data-testid={`${dataTestIdBase}__base-info__row__name__label`}
            >
              {t("Name")}
            </div>
            <div
              className="CollectibleInfo__block__value"
              data-testid={`${dataTestIdBase}__base-info__row__name__value`}
            >
              {name}
            </div>
          </div>
        )}
        {collectionName && (
          <div
            className="CollectibleInfo__base-info__row"
            data-testid={`${dataTestIdBase}__base-info__row__collectionName`}
          >
            <div
              className="CollectibleInfo__block__label"
              data-testid={`${dataTestIdBase}__base-info__row__collectionName__label`}
            >
              {t("Collection")}
            </div>
            <div
              className="CollectibleInfo__block__value"
              data-testid={`${dataTestIdBase}__base-info__row__collectionName__value`}
            >
              {collectionName}
            </div>
          </div>
        )}
        {tokenId && (
          <div
            className="CollectibleInfo__base-info__row"
            data-testid={`${dataTestIdBase}__base-info__row__tokenId`}
          >
            <div
              className="CollectibleInfo__block__label"
              data-testid={`${dataTestIdBase}__base-info__row__tokenId__label`}
            >
              {t("Token ID")}
            </div>
            <div
              className="CollectibleInfo__block__value"
              data-testid={`${dataTestIdBase}__base-info__row__tokenId__value`}
            >
              {tokenId}
            </div>
          </div>
        )}
      </CollectibleInfoBlock>
    </>
  );
};

export const CollectibleDescription = ({
  description,
  dataTestIdBase,
}: {
  description: string;
  dataTestIdBase: string;
}) => {
  const { t } = useTranslation();

  return (
    <>
      <CollectibleInfoBlock
        className="CollectibleInfo__description"
        data-testid={`${dataTestIdBase}__description`}
      >
        <div
          className="CollectibleInfo__block__label"
          data-testid={`${dataTestIdBase}__description__label`}
        >
          {t("Description")}
        </div>
        <div
          className="CollectibleInfo__block__value"
          data-testid={`${dataTestIdBase}__description__value`}
        >
          {description || t("No description available")}
        </div>
      </CollectibleInfoBlock>
    </>
  );
};
