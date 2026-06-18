import { Button } from "@stellar/design-system";
import get from "lodash/get";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import { newTabHref } from "helpers/urls";

import { ROUTES } from "popup/constants/routes";
import { openTab } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";
import {
  confirmPassword,
  hasPrivateKeySelector,
  loadLastUsedAccount,
} from "popup/ducks/accountServices";
import { EnterPassword } from "popup/components/EnterPassword";

import "./styles.scss";
import { AppDispatch } from "popup/App";

export const UnlockAccount = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const from = get(location, "state.from.pathname", "") as ROUTES;
  const queryParams = get(location, "search", "");
  const destination = from || ROUTES.account;

  const [accountAddress, setAccountAddress] = useState("");

  const dispatch = useDispatch<AppDispatch>();
  const hasPrivateKey = useSelector(hasPrivateKeySelector);
  // Track the initial auth state so we don't auto-navigate if the
  // component happens to mount while the wallet is already unlocked
  // (e.g. a stale `/unlock-account` route). We only redirect on the
  // false → true transition that signals an unlock just happened
  // (either via this surface's password submit or via a cross-surface
  // SESSION_UNLOCKED broadcast saving fresh auth state).
  const wasLockedOnMount = useRef(!hasPrivateKey);

  const handleSubmit = async (password: string) => {
    await dispatch(confirmPassword(password));
    // Navigation is handled by the `hasPrivateKey` effect below so
    // that both password-submit and cross-surface SESSION_UNLOCKED
    // broadcasts converge on the same destination.
  };

  useEffect(() => {
    if (wasLockedOnMount.current && hasPrivateKey) {
      navigate(`${destination}${queryParams}`, { replace: true });
    }
  }, [hasPrivateKey, destination, queryParams, navigate]);

  useEffect(() => {
    const fetchLastUsedAccount = async () => {
      const response = (await dispatch(loadLastUsedAccount())) as any;
      if (loadLastUsedAccount.fulfilled.match(response)) {
        setAccountAddress(response.payload.lastUsedAccount);
      }
    };

    fetchLastUsedAccount();
  }, [dispatch]);

  return (
    <React.Fragment>
      <View.Header />

      <EnterPassword
        accountAddress={accountAddress}
        title={t("Welcome back")}
        description={t("Enter password to unlock Freighter")}
        onConfirm={handleSubmit}
        confirmButtonTitle={t("Unlock")}
      />

      <View.Footer customGap="0.5rem">
        <div className="UnlockAccount__footer-label">
          {t("Lost your password? Want to replace your accounts?")}
        </div>

        <Button
          size="lg"
          isFullWidth
          isRounded
          variant="tertiary"
          onClick={() => {
            openTab(newTabHref(ROUTES.recoverAccount));
          }}
        >
          {t("Import using account seed phrase")}
        </Button>

        <Button
          size="lg"
          isFullWidth
          isRounded
          variant="tertiary"
          onClick={() => {
            openTab(newTabHref(ROUTES.accountCreator));
          }}
        >
          {t("Create a wallet")}
        </Button>
      </View.Footer>
    </React.Fragment>
  );
};
