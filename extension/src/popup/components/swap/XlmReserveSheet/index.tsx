import React from "react";
import { useTranslation } from "react-i18next";
import { Button, CopyText, Icon } from "@stellar/design-system";

import { openTab } from "popup/helpers/navigate";
import StellarLogo from "popup/assets/stellar-logo.png";

import "./styles.scss";

interface XlmReserveSheetProps {
  canSwapForReserve: boolean;
  onSwapForReserve?: () => void;
  publicKey: string;
  helpUrl: string;
  /** Destination token code, interpolated into the body + reserve copy. */
  tokenCode?: string;
  onClose: () => void;
}

export const XlmReserveSheet = ({
  canSwapForReserve,
  onSwapForReserve,
  publicKey,
  helpUrl,
  tokenCode = "",
  onClose,
}: XlmReserveSheetProps) => {
  const { t } = useTranslation();

  return (
    <div className="XlmReserveSheet" data-testid="XlmReserveSheet">
      <div className="XlmReserveSheet__top">
        <div className="XlmReserveSheet__badge">
          <Icon.PlusCircle />
        </div>
        <button
          type="button"
          className="XlmReserveSheet__close"
          onClick={onClose}
          aria-label={t("Close")}
          data-testid="XlmReserveSheet__close"
        >
          <Icon.X />
        </button>
      </div>

      <div className="XlmReserveSheet__text">
        <h2 className="XlmReserveSheet__title">
          {t("You need XLM to create a trustline")}
        </h2>
        <p className="XlmReserveSheet__body">
          {t(
            "To receive {{tokenCode}}, your wallet needs a trustline on Stellar.",
            {
              tokenCode,
            },
          )}{" "}
          <button
            type="button"
            className="XlmReserveSheet__why-link"
            data-testid="XlmReserveSheet__why-xlm"
            onClick={() => openTab(helpUrl)}
          >
            {t("Why do I need XLM?")}
          </button>
        </p>
      </div>

      <div className="XlmReserveSheet__card">
        <img
          className="XlmReserveSheet__card-icon"
          src={StellarLogo}
          alt="XLM"
        />
        <div className="XlmReserveSheet__card-text">
          <span className="XlmReserveSheet__card-title">
            {t("0.5 XLM required")}
          </span>
          <span className="XlmReserveSheet__card-body">
            {t(
              "Stellar requires this reserve to add {{tokenCode}}. You can get it back once your {{tokenCode}} balance is zero.",
              { tokenCode },
            )}
          </span>
        </div>
      </div>

      <div className="XlmReserveSheet__actions">
        {canSwapForReserve ? (
          <Button
            size="lg"
            variant="tertiary"
            isFullWidth
            isRounded
            data-testid="XlmReserveSheet__swap-for-reserve"
            onClick={() => {
              onSwapForReserve?.();
              onClose();
            }}
          >
            {t("Swap for 0.5 XLM")}
          </Button>
        ) : null}

        <CopyText textToCopy={publicKey}>
          <Button
            size="lg"
            variant="secondary"
            isFullWidth
            isRounded
            data-testid="XlmReserveSheet__copy-address"
          >
            {t("Copy my wallet address")}
          </Button>
        </CopyText>
      </div>
    </div>
  );
};
