import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Button, Icon, Notification } from "@stellar/design-system";
import { useNavigate } from "react-router-dom";

import { RequestState } from "constants/request";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { Loading } from "popup/components/Loading";
import { View } from "popup/basics/layout/View";
import { navigateTo, openTab } from "popup/helpers/navigate";
import { getStellarExpertUrl } from "popup/helpers/account";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "popup/basics/shadcn/Popover";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { collectionsSelector } from "popup/ducks/cache";
import { ROUTES } from "popup/constants/routes";
import { changeCollectibleVisibility } from "@shared/api/internal";
import { AssetVisibility } from "@shared/api/types/types";

import { useCollectibleDetail } from "./hooks/useCollectibleDetail";
import {
  getCollectibleName,
  CollectibleInfo,
  CollectibleInfoImage,
  CollectibleInfoBlock,
  CollectibleDescription,
} from "../CollectibleInfo";
import "./styles.scss";

export interface SelectedCollectible {
  collectionAddress: string;
  tokenId: string;
}

export const CollectibleDetail = ({
  selectedCollectible,
  handleItemClose,
  isHidden = false,
}: {
  selectedCollectible: SelectedCollectible;
  handleItemClose: () => void;
  isHidden?: boolean;
}) => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const collections = useSelector(collectionsSelector);
  const navigate = useNavigate();
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
  const { state, fetchData: fetchCollectibleMetadata } = useCollectibleDetail();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!collectible) {
    return (
      <View>
        <Notification title={t("Error")} variant="error">
          {t("Collectible not found")}
        </Notification>
      </View>
    );
  }

  const name = getCollectibleName(
    collectible.metadata?.name,
    selectedCollectible.tokenId,
  );

  const attributes = collectible.metadata?.attributes || [];
  const hasAttributes = Array.isArray(attributes) && attributes.length > 0;

  const stellarExpertUrl = getStellarExpertUrl(networkDetails);

  const handleRefreshMetadata = async () => {
    await fetchCollectibleMetadata({
      collectionAddress: selectedCollectible.collectionAddress,
      tokenId: selectedCollectible.tokenId,
      tokenUri: collectible.tokenUri || "",
    });
    setIsPopoverOpen(false);
  };

  const handleSendCollectible = () => {
    // add the collectible data to the query params. They will be used to pre-populate the collectible data in the send flow.
    const queryParams = `?collection_address=${encodeURIComponent(selectedCollectible.collectionAddress)}&collectible_token_id=${encodeURIComponent(selectedCollectible.tokenId)}`;

    navigateTo(ROUTES.sendPayment, navigate, queryParams);
  };

  const handleToggleCollectibleVisibility = async () => {
    const collectibleKey = `${selectedCollectible.collectionAddress}:${selectedCollectible.tokenId}`;
    await changeCollectibleVisibility({
      collectibleKey,
      collectibleVisibility: isHidden
        ? "visible"
        : ("hidden" as AssetVisibility),
      activePublicKey: publicKey || "",
    });
    setIsPopoverOpen(false);
    handleItemClose();
  };

  return (
    <div className="CollectibleDetail" data-testid="CollectibleDetail">
      <View>
        <SubviewHeader
          title={name}
          customBackAction={handleItemClose}
          customBackIcon={<Icon.X />}
          rightButton={
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <div
                className="CollectibleDetail__header__right-button"
                data-testid="CollectibleDetail__header__right-button"
              >
                <PopoverTrigger
                  asChild
                  className="CollectibleDetail__header__right-button__trigger"
                  onClick={() => setIsPopoverOpen(true)}
                >
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
                  <div
                    className="CollectibleDetail__header__right-button__popover-content__item"
                    onClick={handleToggleCollectibleVisibility}
                  >
                    {isHidden ? (
                      <Icon.Eye className="CollectibleDetail__header__right-button__popover-content__item__icon" />
                    ) : (
                      <Icon.EyeOff className="CollectibleDetail__header__right-button__popover-content__item__icon" />
                    )}
                    <div className="CollectibleDetail__header__right-button__popover-content__item__label">
                      {isHidden ? t("Show collectible") : t("Hide collectible")}
                    </div>
                  </div>
                </PopoverContent>
              </div>
            </Popover>
          }
        />
        {state.state === RequestState.LOADING ? (
          <Loading />
        ) : (
          <View.Content>
            <div className="CollectibleDetail__content">
              <div
                className="CollectibleInfo__image"
                data-testid="CollectibleDetail__image"
              >
                <CollectibleInfoImage
                  image={collectible.metadata?.image}
                  name={name}
                />
              </div>
              {isHidden && (
                <Notification
                  icon={<Icon.EyeOff />}
                  variant="warning"
                  title={t("This collectible is hidden")}
                />
              )}
              <CollectibleInfo
                name={name}
                collectionName={collectionData?.collection?.name || ""}
                tokenId={selectedCollectible.tokenId}
                dataTestIdBase="CollectibleDetail"
              />
              <CollectibleDescription
                description={collectible.metadata?.description || ""}
                dataTestIdBase="CollectibleDetail"
              />
              {hasAttributes && (
                <CollectibleInfoBlock
                  className="CollectibleDetail__attributes"
                  data-testid="CollectibleDetail__attributes"
                >
                  <div
                    className="CollectibleDetail__attributes__label"
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
                </CollectibleInfoBlock>
              )}
            </div>
          </View.Content>
        )}
        <View.Footer>
          <div className="CollectibleDetail__footer__buttons">
            {collectible.metadata?.externalUrl && (
              <Button
                data-testid="CollectibleDetail__footer__buttons__view"
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

            <Button
              data-testid="CollectibleDetail__footer__buttons__send"
              isFullWidth
              isRounded
              variant="secondary"
              size="lg"
              onClick={handleSendCollectible}
            >
              {t("Send")}
            </Button>
          </div>
        </View.Footer>
      </View>
    </div>
  );
};
