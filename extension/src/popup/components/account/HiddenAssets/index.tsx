import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";

import { changeAssetVisibility, getHiddenAssets } from "@shared/api/internal";
import { getCanonicalFromAsset } from "helpers/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { useGetAssetDomainsWithBalances } from "helpers/hooks/useGetAssetDomainsWithBalances";
import { AppDispatch } from "popup/App";
import { AssetListRow } from "popup/components/AssetListRow";
import { SlideupModal } from "popup/components/SlideupModal";
import {
  saveHiddenAssets,
  selectHiddenAssetsFor,
} from "popup/ducks/hiddenAssets";
import { isAssetVisible } from "popup/helpers/settings";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { AppState } from "popup/App";

import "./styles.scss";

interface HiddenAssetsProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * The account's hidden assets, with a per-row unhide. Owns its own data so it
 * is entry-point agnostic -- it only needs open/close from whoever hosts it.
 */
export const HiddenAssets = ({ isOpen, onClose }: HiddenAssetsProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState("");

  // showHidden: true, or the hidden assets would be filtered out of the very
  // list this sheet exists to show.
  const { state: domainState, fetchData } = useGetAssetDomainsWithBalances({
    showHidden: true,
    includeIcons: true,
  });

  const resolved =
    domainState.data && domainState.data.type === AppDataType.RESOLVED
      ? domainState.data
      : null;
  const publicKey = resolved?.publicKey || "";
  const networkName = resolved?.networkDetails.networkName || "";

  const hiddenAssets = useSelector((state: AppState) =>
    selectHiddenAssetsFor(state, networkName, publicKey),
  );

  useEffect(() => {
    if (isOpen) {
      // useCache: true is load bearing. A cache-busting fetch dispatches
      // saveBalancesForAccount, which changes the balances cache identity;
      // SearchAsset re-fetches off that, early-returns <Loading /> while it
      // does, and unmounts this sheet -- which remounts with isOpen still
      // true and fetches again, reopening forever.
      fetchData(true);
    } else {
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // useGetBalances only reads the visibility map through to redux when it is
  // filtering (showHidden: false). This sheet asks for showHidden: true, or the
  // hidden assets would be filtered out of the list it exists to show -- so it
  // has to load the map itself rather than depend on another screen having
  // populated the slice first.
  useEffect(() => {
    if (!isOpen || !publicKey || hiddenAssets !== undefined) {
      return;
    }

    let isStale = false;
    const loadVisibility = async () => {
      const { hiddenAssets: fetched } = await getHiddenAssets({
        activePublicKey: publicKey,
      });
      if (!isStale) {
        dispatch(
          saveHiddenAssets({ publicKey, networkName, hiddenAssets: fetched }),
        );
      }
    };

    loadVisibility();

    return () => {
      isStale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, publicKey, networkName, hiddenAssets]);

  const isLoading =
    domainState.state === RequestState.IDLE ||
    domainState.state === RequestState.LOADING ||
    // `undefined` means this account has never been loaded, which is not the
    // same as "nothing hidden" -- show a loader rather than an empty state we
    // would have to take back a moment later.
    hiddenAssets === undefined;

  const hiddenRows = (resolved?.domains || []).filter(
    ({ code = "", issuer = "" }) =>
      !isAssetVisible(hiddenAssets || {}, getCanonicalFromAsset(code, issuer)),
  );

  const handleUnhide = async (asset: ManageAssetCurrency) => {
    const { code = "", issuer = "" } = asset;
    const assetKey = getCanonicalFromAsset(code, issuer);
    setPendingKey(assetKey);
    setError("");

    try {
      const { hiddenAssets: updated, error: visibilityError } =
        await changeAssetVisibility({
          assetKey,
          assetVisibility: "visible",
          activePublicKey: publicKey,
        });

      if (visibilityError) {
        throw new Error(visibilityError);
      }

      dispatch(
        saveHiddenAssets({
          publicKey,
          networkName,
          hiddenAssets: updated,
        }),
      );
      toast.custom(() => (
        <Notification
          variant="success"
          title={t("{{code}} unhidden", { code })}
        />
      ));
    } catch (e) {
      setError(t("Unable to unhide this asset. Please try again."));
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <SlideupModal
      isModalOpen={isOpen}
      setIsModalOpen={onClose}
      ariaLabel={t("Hidden tokens")}
    >
      <div className="HiddenAssets" data-testid="HiddenAssets">
        <div className="HiddenAssets__header">
          <span className="HiddenAssets__title">{t("Hidden tokens")}</span>
          <button
            className="HiddenAssets__close"
            onClick={onClose}
            aria-label={t("Close")}
            data-testid="HiddenAssets__close"
          >
            <Icon.XClose />
          </button>
        </div>

        {error ? (
          <div className="HiddenAssets__error">
            <Notification variant="error" title={error} />
          </div>
        ) : null}

        <div className="HiddenAssets__list">
          {isLoading ? (
            <div className="HiddenAssets__loader">
              <Loader size="1.5rem" />
            </div>
          ) : null}

          {!isLoading && !hiddenRows.length ? (
            <div
              className="HiddenAssets__empty"
              data-testid="HiddenAssets__empty"
            >
              {t("No hidden tokens")}
            </div>
          ) : null}

          {hiddenRows.map((asset) => {
            const { code = "", issuer = "", domain, image, name } = asset;
            const assetKey = getCanonicalFromAsset(code, issuer);

            return (
              <AssetListRow
                key={assetKey}
                code={code}
                displayCode={name || code}
                issuer={issuer}
                iconUrl={image}
                domain={domain}
                data-testid={`HiddenAssets__row-${code}`}
                rightElement={
                  <Button
                    // `md` already matches the design exactly: 32px tall, 6px
                    // radius, 14px text. Deliberately not isRounded -- the row
                    // action is a rounded rect, only the footer is a pill.
                    size="md"
                    variant="tertiary"
                    isLoading={pendingKey === assetKey}
                    disabled={pendingKey !== null}
                    onClick={() => handleUnhide(asset)}
                    data-testid={`HiddenAssets__unhide-${code}`}
                    icon={<Icon.Eye />}
                    iconPosition="right"
                  >
                    {t("Unhide")}
                  </Button>
                }
              />
            );
          })}
        </div>

        <div className="HiddenAssets__footer">
          <Button
            // Bordered, not filled: `secondary` is a solid gray-12 button.
            // Height is nudged to the design's 36px in styles.scss.
            size="md"
            variant="tertiary"
            isRounded
            isFullWidth
            onClick={onClose}
            data-testid="HiddenAssets__done"
          >
            {t("Close")}
          </Button>
        </div>
      </div>
    </SlideupModal>
  );
};
