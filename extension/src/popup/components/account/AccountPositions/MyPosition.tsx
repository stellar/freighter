import React from "react";
import { Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";

import { AssetIcons } from "@shared/api/types";
import { BlendCatalogPool, PoolPosition } from "@shared/api/types/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

interface MyPositionProps {
  position: PoolPosition;
  /** The catalog entry, for the pool-details sheet this screen can open. */
  pool: BlendCatalogPool | null;
  assetIcons: AssetIcons;
  networkDetails: NetworkDetails;
  onClose: () => void;
}

/**
 * One pool position in full: its totals, and the assets supplied to it.
 *
 * Rendered in place by the Positions tab as a bottom sheet (R2), the same way the
 * Tokens tab opens AssetDetail — so the tab stays mounted underneath and
 * dismissal costs nothing. An X rather than a back arrow (R3), matching AssetDetail
 * and CollectibleDetail.
 */
// `position`, `pool`, `assetIcons` and `networkDetails` are part of the public
// interface Task 4 fills the body with, but this task's shell has nothing to
// do with them yet -- destructuring only `onClose` here (rather than the
// brief's full destructure) avoids a `noUnusedParameters` build failure on
// bindings this task never reads.
export const MyPosition = ({ onClose }: MyPositionProps) => {
  const { t } = useTranslation();

  return (
    <View data-testid="my-position-sheet">
      <SubviewHeader
        title={t("My position")}
        customBackIcon={<Icon.X />}
        customBackAction={onClose}
        data-testid="my-position-close"
      />
      {/* Totals, About pool and the supplied-asset list arrive in Task 4. */}
      <View.Content>
        <div className="MyPosition" data-testid="my-position-body" />
      </View.Content>
    </View>
  );
};
