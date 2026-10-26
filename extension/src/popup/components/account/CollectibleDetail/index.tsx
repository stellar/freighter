import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Button, Icon, Notification } from "@stellar/design-system";
import { useNavigate } from "react-router-dom";

import { RequestState } from "constants/request";
import { SheetLayout } from "popup/components/SheetLayout";
import {
  SheetHeader,
  SheetHeaderAction,
  SheetHeaderLayout,
} from "popup/components/SheetHeader";
import { Loading } from "popup/components/Loading";
import { showToast } from "popup/basics/shadcn/Toast";
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
  CollectibleInfoBlock,
  CollectibleDescription,
} from "../CollectibleInfo";
import "./styles.scss";

export interface SelectedCollectible {
  collectionAddress: string;
  tokenId: string;
}

/**
 * Details for a visible collectible. Hidden collectibles never open here:
 * they are listed, and unhidden, in the Hidden collectibles sheet.
 */
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
      <Notification title={t("Error")} variant="error">
        {t("Collectible not found")}
      </Notification>
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
    const queryParams = `?collection_address=${encodeURIComponent(selectedCollectible.collectionAddress)}&collectible_token_id=${encodeURIComponent(selectedCollectible.tokenId)}&return_to=collectible_detail&return_collection_address=${encodeURIComponent(selectedCollectible.collectionAddress)}&return_collectible_token_id=${encodeURIComponent(selectedCollectible.tokenId)}`;

    navigateTo(ROUTES.sendPayment, navigate, queryParams);
  };

  const handleToggleCollectibleVisibility = async () => {
    const collectibleKey = `${selectedCollectible.collectionAddress}:${selectedCollectible.tokenId}`;

    // This used to discard the response entirely, so a failed write closed the
    // sheet exactly as a successful one did. The catch covers the other failure
    // shape: `sendMessageToBackground` rejects outright when the send itself
    // fails, rather than answering with an `error`.
    try {
      const { error } = await changeCollectibleVisibility({
        collectibleKey,
        collectibleVisibility: isHidden
          ? "visible"
          : ("hidden" as AssetVisibility),
        activePublicKey: publicKey || "",
      });

      if (error) {
        throw new Error(error);
      }

      handleItemClose();
      showToast(() => (
        <Notification
          variant="success"
          title={isHidden ? t("Collectible unhidden") : t("Collectible hidden")}
        />
      ));
    } catch (e) {
      showToast(() => (
        <Notification
          variant="error"
          title={
            isHidden
              ? t("Unable to show this collectible")
              : t("Unable to hide this collectible")
          }
        />
      ));
    } finally {
      setIsPopoverOpen(false);
    }
  };

  return (
    <div className="CollectibleDetail" data-testid="CollectibleDetail">
      <SheetLayout
        header={
          // Figma's header (1481:20211): the X on the left, the title
          // centered, the menu on the right.
          <SheetHeader
            layout={SheetHeaderLayout.Centered}
            title={name}
            leading={
              <SheetHeaderAction
                aria-label={t("Close")}
                onClick={handleItemClose}
                data-testid="CollectibleDetail__close"
              >
                <Icon.X />
              </SheetHeaderAction>
            }
            trailing={
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger asChild>
                  <SheetHeaderAction
                    aria-label={t("More options")}
                    data-testid="CollectibleDetail__header__right-button"
                  >
                    <Icon.DotsVertical />
                  </SheetHeaderAction>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="CollectibleDetail__header__right-button__popover-content"
                >
                  <button
                    type="button"
                    className="CollectibleDetail__header__right-button__popover-content__item"
                    onClick={handleRefreshMetadata}
                  >
                    <Icon.RefreshCcw01 className="CollectibleDetail__header__right-button__popover-content__item__icon" />
                    <div className="CollectibleDetail__header__right-button__popover-content__item__label">
                      {t("Refresh metadata")}
                    </div>
                  </button>
                  <button
                    type="button"
                    className="CollectibleDetail__header__right-button__popover-content__item"
                    onClick={() => {
                      openTab(
                        `${stellarExpertUrl}/contract/${collectible.collectionAddress}`,
                      );
                    }}
                  >
                    <Icon.LinkExternal01 className="CollectibleDetail__header__right-button__popover-content__item__icon" />
                    <div className="CollectibleDetail__header__right-button__popover-content__item__label">
                      {t("View on stellar.expert")}
                    </div>
                  </button>
                  <button
                    type="button"
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
                  </button>
                </PopoverContent>
              </Popover>
            }
          />
        }
        footer={
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
        }
      >
        {state.state === RequestState.LOADING ? (
          <Loading />
        ) : (
          <div className="CollectibleDetail__content">
            <CollectibleInfo
              name={name}
              collectionName={collectionData?.collection?.name || ""}
              tokenId={selectedCollectible.tokenId}
              image={collectible.metadata?.image}
              dataTestIdBase="CollectibleDetail"
            />
            {isHidden && (
              <Notification
                variant="warning"
                icon={<Icon.EyeOff />}
                title={t("This collectible is hidden")}
              />
            )}
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
        )}
      </SheetLayout>
    </div>
  );
};
