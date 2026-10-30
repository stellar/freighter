import React, { useRef, useState } from "react";
import { Button, Icon, CopyText } from "@stellar/design-system";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { getCanonicalFromAsset } from "helpers/stellar";
import IconAdd from "popup/assets/icon-add.svg";
import IconRemove from "popup/assets/icon-remove.svg";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";

import "./styles.scss";

interface ManageAssetRowButtonProps {
  code: string;
  issuer: string;
  isTrustlineActive: boolean;
  /**
   * Whether this asset can be removed from the balances view at all. False for
   * SACs, and for custom tokens the backend returns on its own — removing the
   * local entry would not stop them coming back, so those are hide-only.
   */
  isRemovable: boolean;
  isLoading: boolean;
  onClick: () => void;
  /**
   * The account holds this asset but hid it from the balances view. The row
   * then offers Unhide in place of Add or the options menu.
   */
  isHidden?: boolean;
  /** Whether this row's unhide is in flight */
  isUnhiding?: boolean;
  onUnhide?: () => void;
}

/**
 * The Unhide action a hidden asset's row shows in place of Add. Also used by
 * the Hidden tokens sheet, so the two read as the same control.
 */
export const UnhideAssetButton = ({
  isLoading = false,
  onClick,
  "data-testid": dataTestId = "ManageAssetRowButton__unhide",
}: {
  isLoading?: boolean;
  onClick: () => void;
  "data-testid"?: string;
}) => {
  const { t } = useTranslation();

  return (
    <Button
      size="md"
      variant="secondary"
      disabled={isLoading}
      isLoading={isLoading}
      onClick={onClick}
      type="button"
      data-testid={dataTestId}
    >
      <div className="ManageAssetRowButton__label">{t("Unhide")}</div>
      {isLoading ? null : <Icon.Eye />}
    </Button>
  );
};

export const ManageAssetRowButton = ({
  code,
  issuer,
  isTrustlineActive,
  isRemovable,
  isLoading,
  onClick,
  isHidden = false,
  isUnhiding = false,
  onUnhide,
}: ManageAssetRowButtonProps) => {
  const { t } = useTranslation();
  const [rowButtonShowing, setRowButtonShowing] = useState("");

  const ManageAssetRowDropdownRef = useRef<HTMLDivElement>(null);

  const handleBackgroundClick = () => {
    setRowButtonShowing("");
  };
  const canonicalAsset = getCanonicalFromAsset(code, issuer);

  if (isHidden && onUnhide) {
    return (
      <div className="ManageAssetRowButton">
        <UnhideAssetButton isLoading={isUnhiding} onClick={onUnhide} />
      </div>
    );
  }

  return (
    <div className="ManageAssetRowButton">
      {isTrustlineActive ? (
        <div>
          <div
            className={`ManageAssetRowButton__ellipsis ${
              isLoading ? `ManageAssetRowButton__ellipsis--is-pending` : ""
            }`}
            data-testid={`ManageAssetRowButton__ellipsis-${code}`}
            onClick={() => {
              if (!isLoading) {
                setRowButtonShowing(
                  rowButtonShowing === canonicalAsset ? "" : canonicalAsset,
                );
              }
            }}
          >
            <img src={IconEllipsis} alt={t("icon asset options")} />
          </div>
          {rowButtonShowing === canonicalAsset ? (
            <div
              className="ManageAssetRowButton__dropdown"
              ref={ManageAssetRowDropdownRef}
            >
              <div className="ManageAssetRowButton__dropdown__row">
                <CopyText textToCopy={canonicalAsset}>
                  <>
                    <div className="ManageAssetRowButton__label">
                      {t("Copy address")}
                    </div>
                    <Icon.Copy01 />
                  </>
                </CopyText>
              </div>
              {isRemovable && (
                <div className="ManageAssetRowButton__dropdown__row">
                  <Button
                    className="ManageAssetRowButton__remove"
                    size="md"
                    variant="secondary"
                    disabled={isLoading}
                    isLoading={isLoading}
                    onClick={() => {
                      setRowButtonShowing("");
                      onClick();
                    }}
                    type="button"
                    data-testid="ManageAssetRowButton"
                  >
                    <div className="ManageAssetRowButton__label">
                      {t("Remove asset")}
                    </div>
                    {isLoading ? null : (
                      <img src={IconRemove} alt={t("icon remove")} />
                    )}
                  </Button>
                </div>
              )}
              {createPortal(
                <div
                  className="ManageAssetRowButton__dropdown__background"
                  onClick={handleBackgroundClick}
                ></div>,
                document.querySelector("#modal-root")!,
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <Button
          size="md"
          variant="tertiary"
          disabled={isLoading}
          isLoading={isLoading}
          onClick={onClick}
          type="button"
          data-testid="ManageAssetRowButton"
        >
          <div className="ManageAssetRowButton__label">{t("Add")}</div>
          <img src={IconAdd} alt={t("icon add")} />
        </Button>
      )}
    </div>
  );
};
