import React from "react";
import { useTranslation } from "react-i18next";
import * as Popover from "@radix-ui/react-popover";
import { CopyText, Icon } from "@stellar/design-system";

import { openTab } from "popup/helpers/navigate";

import "./styles.scss";

interface SwapTokenMenuProps {
  code: string;
  issuerKey?: string;
  stellarExpertUrl: string;
}

/**
 * The "…" overflow menu shown on the right of a non-held token row in the Swap
 * destination picker: copy the issuer address, or view the asset on
 * stellar.expert.
 */
export const SwapTokenMenu = ({
  code,
  issuerKey = "",
  stellarExpertUrl,
}: SwapTokenMenuProps) => {
  const { t } = useTranslation();

  const viewOnExpert = () => {
    openTab(`${stellarExpertUrl}/asset/${code}-${issuerKey}`);
  };

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="SwapTokenMenu"
          data-testid={`SwapTokenRow-${code}-menu`}
          aria-label={t("More options")}
          onClick={(e) => e.stopPropagation()}
        >
          <Icon.DotsHorizontal />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="SwapTokenMenu__content" sideOffset={4}>
          <CopyText
            textToCopy={issuerKey}
            variant="headless"
            tooltipPlacement="top"
          >
            <button
              type="button"
              className="SwapTokenMenu__item"
              data-testid={`SwapTokenRow-${code}-copy`}
            >
              {t("Copy address")}
            </button>
          </CopyText>
          <button
            type="button"
            className="SwapTokenMenu__item"
            data-testid={`SwapTokenRow-${code}-view-expert`}
            onClick={viewOnExpert}
          >
            {t("View on stellar.expert")}
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
