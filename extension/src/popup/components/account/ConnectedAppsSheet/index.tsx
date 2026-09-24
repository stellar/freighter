import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button, Icon, Notification } from "@stellar/design-system";
import { toast } from "sonner";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { SlideupModal } from "popup/components/SlideupModal";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { RemoveButton } from "popup/basics/buttons/RemoveButton";
import {
  saveAllowList,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";

import "./styles.scss";

interface ConnectedAppsSheetProps {
  allowList: string[];
  isOpen: boolean;
  onClose: () => void;
  /**
   * Ask the host to re-read app data. Called on open and after every
   * disconnect, since `allowList` is a prop rather than something this sheet
   * fetches -- a dApp connecting while the popup sits open would otherwise not
   * show up until Home happened to refetch.
   */
  onRefresh: () => void;
}

/**
 * The dApps connected to the active account on the active network.
 *
 * Scoped to the active network on purpose: the screen this replaces carried a
 * network picker, but the designs drop it. Apps connected on another network
 * are still stored, and become reachable again by switching networks in
 * Settings.
 */
export const ConnectedAppsSheet = ({
  allowList,
  isOpen,
  onClose,
  onRefresh,
}: ConnectedAppsSheetProps) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    onRefresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const notify = (variant: "success" | "error", title: string) => {
    toast.custom(() => <Notification variant={variant} title={title} />);
  };

  // `saveAllowList` rejects into `rejectWithValue`, so awaiting the dispatch
  // resolves either way -- the returned action is the only success signal.
  const handleRemove = async (domainToRemove: string) => {
    const res = await dispatch(
      saveAllowList({
        domain: domainToRemove,
        networkName: networkDetails.networkName,
      }),
    );
    onRefresh();

    if (saveAllowList.fulfilled.match(res)) {
      notify(
        "success",
        t("{{appName}} disconnected", { appName: domainToRemove }),
      );
    } else {
      notify(
        "error",
        t("Couldn’t disconnect {{appName}}", { appName: domainToRemove }),
      );
    }
  };

  const handleRemoveAll = async () => {
    const results = [];
    for (const domain of allowList) {
      results.push(
        await dispatch(
          saveAllowList({ domain, networkName: networkDetails.networkName }),
        ),
      );
    }
    onRefresh();

    // A partial failure leaves apps connected, so don't report the batch done.
    if (results.every((res) => saveAllowList.fulfilled.match(res))) {
      notify("success", t("All apps disconnected"));
    } else {
      notify("error", t("Couldn’t disconnect all apps"));
    }
  };

  return (
    <SlideupModal isModalOpen={isOpen} setIsModalOpen={onClose}>
      <div className="ConnectedAppsSheet" data-testid="ConnectedAppsSheet">
        <div className="ConnectedAppsSheet__header">
          <span className="ConnectedAppsSheet__title">
            {t("Connected apps")}
          </span>
          <button
            className="ConnectedAppsSheet__close"
            onClick={onClose}
            aria-label={t("Close")}
            data-testid="ConnectedAppsSheet__close"
          >
            <Icon.XClose />
          </button>
        </div>

        {allowList.length ? (
          <div className="ConnectedAppsSheet__wrapper">
            <div className="ConnectedAppsSheet__list">
              {allowList.map(
                (allowedDomain) =>
                  allowedDomain && (
                    <div
                      className="ConnectedAppsSheet__row"
                      key={allowedDomain}
                    >
                      <PunycodedDomain domain={allowedDomain} isRow />
                      <RemoveButton
                        onClick={() => handleRemove(allowedDomain)}
                      />
                    </div>
                  ),
              )}
            </div>

            {/* No `className` on purpose: SDS spreads props after its own
                className, so passing one replaces `Button Button--error ...`
                rather than adding to it, leaving an unstyled block. */}
            <Button
              size="lg"
              variant="error"
              isFullWidth
              isRounded
              onClick={handleRemoveAll}
              data-testid="disconnect-all"
            >
              {t("Disconnect all")}
            </Button>
          </div>
        ) : (
          <div
            className="ConnectedAppsSheet__empty"
            data-testid="connected-apps-empty"
          >
            <div className="ConnectedAppsSheet__empty__badge">
              <Icon.NotificationBox />
            </div>
            <div className="ConnectedAppsSheet__empty__title">
              {t("Nothing connected yet")}
            </div>
            <div className="ConnectedAppsSheet__empty__subtitle">
              {t("Discover apps and connect your first one.")}
            </div>
            <Button
              size="lg"
              variant="secondary"
              isRounded
              onClick={() => navigateTo(ROUTES.discover, navigate)}
              data-testid="go-to-discover"
            >
              {t("Go to Discover")}
            </Button>
          </div>
        )}
      </div>
    </SlideupModal>
  );
};
