import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { QRCodeSVG } from "qrcode.react";
import { Icon, Button, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";

import { emitMetric } from "helpers/metrics";
import { truncatedPublicKey } from "helpers/stellar";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { openTab } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";
import { accountNameSelector } from "popup/ducks/accountServices";
import { AppDataType, useGetAppData } from "helpers/hooks/useGetAppData";
import { RequestState } from "constants/request";
import { Loading } from "popup/components/Loading";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";
import { newTabHref } from "helpers/urls";
import { reRouteOnboarding } from "popup/helpers/route";

import StellarLogo from "popup/assets/stellar-logo.png";

import "./styles.scss";

export const ViewPublicKey = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const accountName = useSelector(accountNameSelector);
  const { state, fetchData } = useGetAppData();
  // Holds the currently-shown copy-toast's id (see copyAddress below for why
  // this can't be a stable id). Declared here, above the early returns, so
  // this hook always runs regardless of which branch this render takes.
  const lastToastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    const getData = async () => {
      await fetchData();
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

  const { publicKey } = state.data.account;

  // Deliberately NOT a stable id. sonner's Observer.create() checks
  // `alreadyExists = this.toasts.find(t => t.id === id)` and, when true, takes
  // an "update" path instead of mounting a new toast - but Observer.dismiss(id)
  // (fired on a manual swipe) only adds the id to `dismissedToasts`, it never
  // removes the entry from `this.toasts`. Reusing a stable id here made that
  // stale-update path reachable and a real user hit a case where, after
  // swiping a toast away, tapping "Copy" again showed nothing. Instead we keep
  // the last-shown toast's id in a ref (declared above, before the early
  // returns) and explicitly dismiss it before creating a new one with a
  // fresh, auto-generated id, so the "replace instead of stack" behavior is
  // preserved without ever reusing an id and risking that path. Do not
  // "simplify" this back to a shared constant id.
  const showToast = (render: (id: string | number) => React.ReactElement) => {
    if (lastToastIdRef.current !== null) {
      toast.dismiss(lastToastIdRef.current);
    }
    lastToastIdRef.current = toast.custom(render);
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(publicKey);
      emitMetric(METRIC_NAMES.accountPublicKeyCopied);
      showToast(() => (
        <Notification
          variant="success"
          title={t("Address {{address}} copied!", {
            address: truncatedPublicKey(publicKey),
          })}
        />
      ));
    } catch {
      showToast(() => (
        <Notification
          variant="error"
          title={t("Couldn’t copy your wallet address")}
        />
      ));
    }
  };

  return (
    <React.Fragment>
      <View.AppHeader hasBackButton customBackIcon={<Icon.X />} />
      <View.Content>
        <div className="ViewPublicKey__content">
          <div className="ViewPublicKey__account">
            <div className="ViewPublicKey__account__identicon">
              <IdenticonImg publicKey={publicKey} />
            </div>
            <div className="ViewPublicKey__account__text">
              <div
                className="ViewPublicKey__account__name"
                data-testid="view-public-key-account-name"
              >
                {accountName}
              </div>
              <div className="ViewPublicKey__account__address">
                {truncatedPublicKey(publicKey)}
              </div>
            </div>
          </div>

          <div className="ViewPublicKey__qr-code">
            <QRCodeSVG
              value={publicKey}
              style={{
                width: "10rem",
                height: "10rem",
              }}
            />
          </div>

          <div className="ViewPublicKey__network-chip">
            <img src={StellarLogo} alt="" />
            <span>{t("Stellar")}</span>
          </div>
        </div>
      </View.Content>
      <View.Footer>
        <div className="ViewPublicKey__footer">
          <div className="ViewPublicKey__footer__caption">
            {t("This address supports Stellar network.")}
          </div>
          {/* account.public_key_copied carries no source and never the raw
              key. Emitted from copyAddress only once the clipboard write
              succeeds, so failed copies aren't counted. */}
          <Button
            size="lg"
            variant="secondary"
            isFullWidth
            isRounded
            icon={<Icon.Copy01 />}
            iconPosition="left"
            onClick={copyAddress}
          >
            {t("Copy wallet address")}
          </Button>
        </div>
      </View.Footer>
    </React.Fragment>
  );
};
