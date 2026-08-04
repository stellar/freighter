import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { QRCodeSVG } from "qrcode.react";
import { Icon, CopyText, Button, Notification } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation } from "react-router-dom";

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
          <CopyText textToCopy={publicKey} doneLabel={t("Copied!")}>
            {/* account.public_key_copied carries no source and never the raw
                key. CopyText has no copy callback, so emit on click. */}
            <Button
              size="lg"
              variant="primary"
              isFullWidth
              isRounded
              icon={<Icon.Copy01 />}
              iconPosition="left"
              onClick={() => emitMetric(METRIC_NAMES.accountPublicKeyCopied)}
            >
              {t("Copy wallet address")}
            </Button>
          </CopyText>
        </div>
      </View.Footer>
    </React.Fragment>
  );
};
