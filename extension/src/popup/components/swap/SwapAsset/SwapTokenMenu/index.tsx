import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Popover from "@radix-ui/react-popover";
import { Icon, Tooltip } from "@stellar/design-system";

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
  const [copied, setCopied] = useState(false);

  // Briefly show the "Copied" tooltip after a successful copy, then hide it.
  useEffect(() => {
    if (!copied) {
      return undefined;
    }
    const timeoutId = window.setTimeout(() => setCopied(false), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  const copyAddress = async () => {
    if (!issuerKey) {
      return;
    }
    await navigator.clipboard.writeText(issuerKey);
    setCopied(true);
  };

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
          <Tooltip
            isVisible={copied}
            placement="top"
            triggerEl={
              <button
                type="button"
                className="SwapTokenMenu__item"
                data-testid={`SwapTokenRow-${code}-copy`}
                onClick={copyAddress}
              >
                {t("Copy address")}
              </button>
            }
          >
            {t("Copied")}
          </Tooltip>
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
