import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { Button, Icon, Notification, Select } from "@stellar/design-system";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { saveAllowList } from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";

import { View } from "popup/basics/layout/View";
import { RemoveButton } from "popup/basics/buttons/RemoveButton";
import { AppDispatch } from "popup/App";
import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { openTab } from "popup/helpers/navigate";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";
import {
  ScreenReaderOnly,
  Sheet,
  SheetContent,
  SheetTitle,
} from "popup/basics/shadcn/Sheet";
import { Discover } from "popup/views/Discover";

import "./styles.scss";

export const ManageConnectedApps = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation();
  const location = useLocation();
  const [selectedNetworkName, setSelectedNetworkName] = useState("");
  const [selectedAllowlist, setSelectedAllowlist] = useState<string[]>([]);
  const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);

  const { state, fetchData } = useGetAppData();

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNetworkName(e.target.value);
  };

  const notify = (variant: "success" | "error", title: string) => {
    toast.custom(() => <Notification variant={variant} title={title} />);
  };

  // `saveAllowList` rejects into `rejectWithValue`, so awaiting the dispatch
  // resolves either way — the returned action is the only success signal.
  const handleRemove = async (domainToRemove: string) => {
    const res = await dispatch(
      saveAllowList({
        domain: domainToRemove,
        networkName: selectedNetworkName,
      }),
    );
    await fetchData(false);

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
    for (const domain of selectedAllowlist) {
      results.push(
        await dispatch(
          saveAllowList({ domain, networkName: selectedNetworkName }),
        ),
      );
    }
    await fetchData(false);

    // A partial failure leaves apps connected, so don't report the batch done.
    if (results.every((res) => saveAllowList.fulfilled.match(res))) {
      notify("success", t("All apps disconnected"));
    } else {
      notify("error", t("Couldn’t disconnect all apps"));
    }
  };

  useEffect(() => {
    if (
      state.state === RequestState.SUCCESS &&
      state.data.type === AppDataType.RESOLVED
    ) {
      const { publicKey } = state.data.account;
      const { allowList, networkDetails } = state.data.settings;

      setSelectedAllowlist(
        allowList?.[selectedNetworkName || networkDetails.networkName]?.[
          publicKey
        ] || [],
      );
      if (!selectedNetworkName) {
        setSelectedNetworkName(networkDetails.networkName);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setSelectedAllowlist, selectedNetworkName, state.state]);

  useEffect(() => {
    const getData = async () => {
      await fetchData(false);
    };
    getData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (
    state.state === RequestState.IDLE ||
    state.state === RequestState.LOADING
  ) {
    return <Loading />;
  }

  if (state.state === RequestState.ERROR) {
    return (
      <div className="AddAsset__fetch-fail">
        <Notification
          variant="error"
          title={t("Failed to fetch your account data.")}
        >
          {t("Your account data could not be fetched at this time.")}
        </Notification>
      </div>
    );
  }

  if (state.data?.type === AppDataType.REROUTE) {
    if (state.data.shouldOpenTab) {
      openTab(newTabHref(state.data.routeTarget));
      window.close();
    }
    return (
      <Navigate
        to={`${state.data.routeTarget}${location.search}`}
        state={{ from: location }}
        replace
      />
    );
  }

  reRouteOnboarding({
    type: state.data.type,
    applicationState: state.data.account.applicationState,
    state: state.state,
  });

  const { networksList } = state.data.settings;

  return (
    <React.Fragment>
      <SubviewHeader title={t("Connected apps")} customBackIcon={<Icon.X />} />
      <View.Content hasNoTopPadding>
        <div className="ManageConnectedApps">
          <div className="ManageConnectedApps__network-pill">
            <NetworkIcon
              index={networksList.findIndex(
                ({ networkName: currNetworkName }) =>
                  currNetworkName === selectedNetworkName,
              )}
            />
            <span className="ManageConnectedApps__network-pill__label">
              {selectedNetworkName}
            </span>
            <Icon.ChevronDown className="ManageConnectedApps__network-pill__chevron" />
            {/* The visible label is a sibling, not a <label>, so the select
                needs its own accessible name. */}
            <Select
              data-testid="manage-connected-apps-select"
              aria-label={t("Select network")}
              fieldSize="md"
              id="select"
              className="ManageConnectedApps__network-pill__select"
              onChange={handleSelectChange}
            >
              {networksList.map(({ networkName }) => (
                <option
                  value={networkName}
                  key={networkName}
                  selected={networkName === selectedNetworkName}
                >
                  {networkName}
                </option>
              ))}
            </Select>
          </div>
          {selectedAllowlist.length ? (
            <div className="ManageConnectedApps__wrapper">
              <div className="ManageConnectedApps__list">
                {selectedAllowlist.map(
                  (allowedDomain) =>
                    allowedDomain && (
                      <div
                        className="ManageConnectedApps__row"
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
                  rather than adding to it, leaving an unstyled block. These
                  props alone give the frame's red pill; style via `.Button`
                  from the wrapper if it ever needs overriding. */}
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
              className="ManageConnectedApps__empty"
              data-testid="connected-apps-empty"
            >
              <div className="ManageConnectedApps__empty__badge">
                <Icon.NotificationBox />
              </div>
              <div className="ManageConnectedApps__empty__title">
                {t("Nothing connected yet")}
              </div>
              <div className="ManageConnectedApps__empty__subtitle">
                {t("Discover apps and connect your first one.")}
              </div>
              <Button
                size="lg"
                variant="secondary"
                isRounded
                onClick={() => setIsDiscoverOpen(true)}
                data-testid="go-to-discover"
              >
                {t("Go to Discover")}
              </Button>
            </div>
          )}
        </div>
      </View.Content>
      <Sheet
        open={isDiscoverOpen}
        onOpenChange={(open) => !open && setIsDiscoverOpen(false)}
      >
        <SheetContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          aria-describedby={undefined}
          side="bottom"
          className="ManageConnectedApps__discover-sheet"
        >
          <ScreenReaderOnly>
            <SheetTitle>{t("Discover")}</SheetTitle>
          </ScreenReaderOnly>
          <Discover onClose={() => setIsDiscoverOpen(false)} />
        </SheetContent>
      </Sheet>
    </React.Fragment>
  );
};
