import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Icon, Loader, Notification } from "@stellar/design-system";

import { AssetVisibility, IssuerKey } from "@shared/api/types";
import { changeAssetVisibility, getHiddenAssets } from "@shared/api/internal";
import { getCanonicalFromAsset } from "helpers/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { useGetAssetDomainsWithBalances } from "helpers/hooks/useGetAssetDomainsWithBalances";
import { AssetListRow } from "popup/components/AssetListRow";
import { SheetHeader } from "popup/components/SheetHeader";
import { SheetLayout } from "popup/components/SheetLayout";
import { SlideupModal } from "popup/components/SlideupModal";
import { showToast } from "popup/basics/shadcn/Toast";
import { isAssetVisible } from "popup/helpers/settings";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";

import "./styles.scss";

interface HiddenAssetsProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called after a successful unhide, so a host that keeps its own copy of
   * the hidden map (SearchAsset's rows) can refresh it.
   */
  onVisibilityChange?: () => void;
}

/**
 * The account's hidden assets, with a per-row unhide. Owns its own data so it
 * is entry-point agnostic -- it only needs open/close from whoever hosts it.
 */
export const HiddenAssets = ({
  isOpen,
  onClose,
  onVisibilityChange,
}: HiddenAssetsProps) => {
  const { t } = useTranslation();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  // `undefined` means the map has not been loaded for this opening, which is
  // not the same as "nothing hidden".
  const [hiddenAssets, setHiddenAssets] = useState<
    Record<IssuerKey, AssetVisibility> | undefined
  >(undefined);
  // The visibility map failing to load is not the same as "nothing hidden": it
  // has to stop the loader without letting the empty state claim the account
  // has no hidden assets.
  const [didVisibilityFail, setDidVisibilityFail] = useState(false);

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
  const network = resolved?.networkDetails.network || "";

  useEffect(() => {
    if (isOpen) {
      // useCache: true is load bearing. A cache-busting fetch dispatches
      // saveBalancesForAccount, which changes the balances cache identity;
      // SearchAsset re-fetches off that, early-returns <Loading /> while it
      // does, and unmounts this sheet -- which remounts with isOpen still
      // true and fetches again, reopening forever.
      // `useGetAssetDomainsWithBalances` dispatches FETCH_DATA_ERROR *and*
      // rethrows, so this call rejects. Left floating it was an unhandled
      // rejection, and because the reducer nulls `data` the sheet lost its
      // publicKey, never loaded a visibility map, and sat on the loader for
      // good. `didDomainsFail` below turns that into the error state.
      fetchData(true).catch(() => {});
    } else {
      // Reload on the next opening: a hide from Asset Details in between
      // would otherwise be missing from the list.
      setHiddenAssets(undefined);
      setError("");
      setDidVisibilityFail(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Balances are fetched with showHidden: true, so the balances hook never
  // reads the visibility map on this screen -- the sheet has to load it
  // itself rather than depend on another screen having done so.
  useEffect(() => {
    if (!isOpen || !publicKey || hiddenAssets !== undefined) {
      return;
    }

    let isStale = false;
    const loadVisibility = async () => {
      try {
        const { hiddenAssets: fetched, error: fetchError } =
          await getHiddenAssets({
            activePublicKey: publicKey,
            network,
          });
        if (isStale) {
          return;
        }
        if (fetchError) {
          throw new Error(fetchError);
        }
        setHiddenAssets(fetched || {});
      } catch (e) {
        // Without this the rejection is unhandled and the map stays
        // undefined, which `isLoading` reads as "still loading" -- a
        // permanent spinner.
        if (!isStale) {
          setDidVisibilityFail(true);
          setError(t("Unable to load hidden tokens. Please try again."));
        }
      }
    };

    loadVisibility();

    return () => {
      isStale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, publicKey, network, hiddenAssets]);

  // A failed balances/domains fetch nulls `data`, so `publicKey` is "" and the
  // visibility effect never runs: without this the third clause below is true
  // forever and the sheet spins with nothing on screen to say why.
  const didDomainsFail = domainState.state === RequestState.ERROR;

  const isLoading =
    domainState.state === RequestState.IDLE ||
    domainState.state === RequestState.LOADING ||
    // `undefined` means the map has not been loaded, which is not the same as
    // "nothing hidden" -- show a loader rather than an empty state we would
    // have to take back a moment later.
    (hiddenAssets === undefined && !didVisibilityFail && !didDomainsFail);

  // One message for both failures. The visibility path sets `error` itself; the
  // domains path is derived, so a retry that succeeds clears it on its own.
  const loadError =
    error ||
    (didDomainsFail
      ? t("Unable to load hidden tokens. Please try again.")
      : "");

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
          assetIssuer: assetKey,
          assetVisibility: "visible",
          activePublicKey: publicKey,
          network,
        });

      if (visibilityError) {
        throw new Error(visibilityError);
      }

      setHiddenAssets(updated || {});
      onVisibilityChange?.();
      showToast(() => (
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
      <SheetLayout
        data-testid="HiddenAssets"
        header={
          <SheetHeader
            title={t("Hidden tokens")}
            onClose={onClose}
            closeTestId="HiddenAssets__close"
          />
        }
      >
        <div className="HiddenAssets">
          {loadError ? (
            <div
              className="HiddenAssets__error"
              data-testid="HiddenAssets__error"
            >
              <Notification variant="error" title={loadError} />
            </div>
          ) : null}

          <div className="HiddenAssets__list">
            {isLoading ? (
              <div
                className="HiddenAssets__loader"
                data-testid="HiddenAssets__loader"
              >
                <Loader size="1.5rem" />
              </div>
            ) : null}

            {!isLoading &&
            !didVisibilityFail &&
            !didDomainsFail &&
            !hiddenRows.length ? (
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
        </div>
      </SheetLayout>
    </SlideupModal>
  );
};
