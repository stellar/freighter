import { Button } from "@stellar/design-system";
import get from "lodash/get";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";

import { newTabHref } from "helpers/urls";

import { ROUTES } from "popup/constants/routes";
import { openTab } from "popup/helpers/navigate";
import { View } from "popup/basics/layout/View";
import {
  confirmPassword,
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

  const handleSubmit = async (password: string) => {
    const res = await dispatch(confirmPassword(password));
    if (confirmPassword.fulfilled.match(res) && res.payload.publicKey) {
      // skip this location in history, we won't need to come back here after unlocking account
      navigate(`${destination}${queryParams}`, { replace: true });
    }
  };

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
