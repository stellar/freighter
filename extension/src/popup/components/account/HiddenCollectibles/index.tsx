import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { Collection } from "@shared/api/types/types";
import {
  ScreenReaderOnly,
  Sheet,
  SheetContent,
  SheetTitle,
} from "popup/basics/shadcn/Sheet";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { CollectibleDetail, SelectedCollectible } from "../CollectibleDetail";
import { CollectibleInfoImage } from "../CollectibleInfo";

import "./styles.scss";

interface HiddenCollectiblesProps {
  collections: Collection[];
  refreshHiddenCollectibles: () => Promise<void>;
  isCollectibleHidden: (collectionAddress: string, tokenId: string) => boolean;
  isOpen: boolean;
  onClose: () => void;
}

export const HiddenCollectibles = ({
  collections,
  refreshHiddenCollectibles,
  isCollectibleHidden,
  isOpen,
  onClose,
}: HiddenCollectiblesProps) => {
  const { t } = useTranslation();
  const [selectedCollectible, setSelectedCollectible] =
    useState<SelectedCollectible | null>(null);
  // Keep track of the last selected collectible so we can render it during close animation
  const lastSelectedCollectible = useRef<SelectedCollectible | null>(null);

  // Update the ref when a collectible is selected
  useEffect(() => {
    if (selectedCollectible) {
      lastSelectedCollectible.current = selectedCollectible;
    }
  }, [selectedCollectible]);

  // Refresh hidden collectibles when sheet opens
  useEffect(() => {
    if (isOpen) {
      refreshHiddenCollectibles();
    }
  }, [isOpen, refreshHiddenCollectibles]);

  const handleCloseCollectible = () => {
    setSelectedCollectible(null);
    // Refresh the shared state - this will update all components using the hook
    refreshHiddenCollectibles();
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
            <SheetTitle>
              {selectedCollectible?.tokenId ||
                lastSelectedCollectible.current?.tokenId ||
                ""}
            </SheetTitle>
          </ScreenReaderOnly>
          {(selectedCollectible || lastSelectedCollectible.current) && (
            <CollectibleDetail
              selectedCollectible={
                selectedCollectible || lastSelectedCollectible.current!
              }
              handleItemClose={handleCloseCollectible}
              isHidden
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};
