import React, { useRef, useState } from "react";
import { Button, Icon, CopyText } from "@stellar/design-system";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";

import { AppDispatch } from "popup/App";
import { getCanonicalFromAsset } from "helpers/stellar";
import { resetSubmitStatus } from "popup/ducks/transactionSubmission";
import IconAdd from "popup/assets/icon-add.svg";
import IconRemove from "popup/assets/icon-remove.svg";
import IconEllipsis from "popup/assets/icon-ellipsis.svg";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { TrustlineError } from "../TrustlineError";

import "./styles.scss";

interface ManageAssetRowButtonProps {
  code: string;
  issuer: string;
  isTrustlineActive: boolean;
  balances: AccountBalances;
  isLoading: boolean;
  onClick: () => void;
}

export const ManageAssetRowButton = ({
  code,
  issuer,
  isTrustlineActive,
  balances,
  isLoading,
  onClick,
}: ManageAssetRowButtonProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const [rowButtonShowing, setRowButtonShowing] = useState("");
  const [isTrustlineErrorShowing, setIsTrustlineErrorShowing] = useState(false);

  const ManageAssetRowDropdownRef = useRef<HTMLDivElement>(null);

  const handleBackgroundClick = () => {
    setRowButtonShowing("");
  };
  const canonicalAsset = getCanonicalFromAsset(code, issuer);

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
            <img src={IconEllipsis} alt="icon asset options" />
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
              <div className="ManageAssetRowButton__dropdown__row">
                <Button
                  className="ManageAssetRowButton__remove"
                  size="md"
                  variant="secondary"
                  disabled={isLoading}
                  isLoading={isLoading}
                  onClick={onClick}
                  type="button"
                  data-testid="ManageAssetRowButton"
                >
                  <div className="ManageAssetRowButton__label">
                    {t("Remove asset")}
                  </div>
                  {isLoading ? null : (
                    <img src={IconRemove} alt="icon remove" />
                  )}
                </Button>
              </div>
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
          <img src={IconAdd} alt="icon add" />
        </Button>
      )}
      {isTrustlineErrorShowing
        ? createPortal(
            <TrustlineError
              balances={balances}
              handleClose={() => {
                setIsTrustlineErrorShowing(false);
                dispatch(resetSubmitStatus());
              }}
            />,
            document.querySelector("#modal-root")!,
          )
        : null}
    </div>
  );
};
