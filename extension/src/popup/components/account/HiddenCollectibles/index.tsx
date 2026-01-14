import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Icon } from "@stellar/design-system";

import { Collection, CollectibleKey } from "@shared/api/types/types";
import {
  ScreenReaderOnly,
  Sheet,
  SheetContent,
  SheetTitle,
} from "popup/basics/shadcn/Sheet";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { CollectibleDetail, SelectedCollectible } from "../CollectibleDetail";
import { getHiddenCollectibles } from "@shared/api/internal";
import { publicKeySelector } from "popup/ducks/accountServices";
import { CollectibleInfoImage } from "../CollectibleInfo";

import "./styles.scss";

interface HiddenCollectiblesProps {
  collections: Collection[];
  isOpen: boolean;
  onClose: () => void;
}

export const HiddenCollectibles = ({
  collections,
  isOpen,
  onClose,
}: HiddenCollectiblesProps) => {
  const { t } = useTranslation();
  const publicKey = useSelector(publicKeySelector);
  const [hiddenCollectibles, setHiddenCollectibles] = useState<
    Record<CollectibleKey, string>
  >({});
  const [selectedCollectible, setSelectedCollectible] =
    useState<SelectedCollectible | null>(null);

  const fetchHiddenCollectibles = useCallback(async () => {
    try {
      const { hiddenCollectibles: hidden } = await getHiddenCollectibles({
        activePublicKey: publicKey || "",
      });
      setHiddenCollectibles(hidden || {});
    } catch (error) {
      console.error("Failed to fetch hidden collectibles:", error);
      setHiddenCollectibles({});
    }
  }, [publicKey]);

  useEffect(() => {
    if (isOpen) {
      fetchHiddenCollectibles();
    }
  }, [isOpen, fetchHiddenCollectibles]);

  const isCollectibleHidden = (collectionAddress: string, tokenId: string) => {
    const key = `${collectionAddress}:${tokenId}`;
    return hiddenCollectibles[key] === "hidden";
  };

  const handleCloseCollectible = () => {
    setSelectedCollectible(null);
    fetchHiddenCollectibles();
  };

  // Get all hidden collectibles across all collections
  const hiddenItems: Array<{
    collection: Collection["collection"];
    tokenId: string;
    metadata: { image?: string; name?: string };
  }> = [];

  collections.forEach(({ collection, error }) => {
    if (error || !collection) return;

    collection.collectibles.forEach((item) => {
      if (isCollectibleHidden(collection.address, item.tokenId)) {
        hiddenItems.push({
          collection,
          tokenId: item.tokenId,
          metadata: item.metadata || {},
        });
      }
    });
  });

  const hasHiddenCollectibles = hiddenItems.length > 0;

  return (
    <>
      {/* Main Hidden Collectibles Sheet */}
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          aria-describedby={undefined}
          side="bottom"
          className="HiddenCollectibles__sheet"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <ScreenReaderOnly>
            <SheetTitle>{t("Hidden Collectibles")}</SheetTitle>
          </ScreenReaderOnly>
          <View>
            <SubviewHeader
              title={t("Hidden Collectibles")}
              customBackAction={onClose}
              customBackIcon={<Icon.X />}
            />
            <View.Content hasNoTopPadding>
              {hasHiddenCollectibles ? (
                <div className="HiddenCollectibles__grid">
                  {hiddenItems.map((item) => (
                    <div
                      className="HiddenCollectibles__grid__item"
                      onClick={() => {
                        setSelectedCollectible({
                          collectionAddress: item.collection?.address || "",
                          tokenId: item.tokenId,
                        });
                      }}
                      key={`${item.collection?.address}:${item.tokenId}`}
                      data-testid={`hidden-collectible-${item.tokenId}`}
                    >
                      <CollectibleInfoImage
                        image={item.metadata?.image}
                        name={item.tokenId}
                      />
                      <div className="HiddenCollectibles__grid__item__overlay">
                        <Icon.EyeOff />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="HiddenCollectibles__empty">
                  <Icon.EyeOff />
                  <span>{t("No hidden collectibles")}</span>
                </div>
              )}
            </View.Content>
          </View>
        </SheetContent>
      </Sheet>

      {/* Collectible Detail Sheet - overlays on top */}
      <Sheet
        open={!!selectedCollectible}
        onOpenChange={(open) => {
          if (!open) {
            handleCloseCollectible();
          }
        }}
      >
        <SheetContent
          aria-describedby={undefined}
          side="bottom"
          className="HiddenCollectibles__collectible-detail__sheet"
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ zIndex: 100 }}
        >
          <ScreenReaderOnly>
            <SheetTitle>{selectedCollectible?.tokenId || ""}</SheetTitle>
          </ScreenReaderOnly>
          {selectedCollectible && (
            <CollectibleDetail
              selectedCollectible={selectedCollectible}
              handleItemClose={handleCloseCollectible}
              isHidden
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
