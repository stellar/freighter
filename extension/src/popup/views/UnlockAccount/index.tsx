import { Button } from "@stellar/design-system";
import get from "lodash/get";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDispatch } from "react-redux";
import { useLocation, useHistory } from "react-router-dom";

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

export const UnlockAccount = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const from = get(location, "state.from.pathname", "") as ROUTES;
  const queryParams = get(location, "search", "");
  const destination = from || ROUTES.account;

  const [lastUsedAccount, setLastUsedAccount] = useState("");

  const dispatch = useDispatch();

  const handleSubmit = async (password: string) => {
    // eslint-disable-next-line @typescript-eslint/await-thenable
    await dispatch(confirmPassword(password));
    // skip this location in history, we won't need to come back here after unlocking account
    history.replace(`${destination}${queryParams}`);
  };

  useEffect(() => {
    const fetchLastUsedAccount = async () => {
      /* eslint-disable */
      const response = (await dispatch(loadLastUsedAccount())) as any;
      if (loadLastUsedAccount.fulfilled.match(response)) {
        setLastUsedAccount(response.payload.lastUsedAccount);
      }
      /* eslint-enable */
    };

    fetchLastUsedAccount();
  }, [dispatch]);

  return (
    <React.Fragment>
      <View.Header />

      <EnterPassword
        accountAddress={lastUsedAccount}
        title={t("Welcome back!")}
        description={t("Enter password to unlock Freighter")}
        onConfirm={handleSubmit}
        confirmButtonTitle={t("Login")}
      />

      <View.Footer customGap="0.5rem">
        <div className="UnlockAccount__footer-label">
          {t("Want to add another account?")}
        </div>

        <Button
          size="md"
          isFullWidth
          variant="tertiary"
          onClick={() => {
            openTab(newTabHref(ROUTES.recoverAccount));
          }}
        >
          {t("Import using account seed phrase")}
        </Button>

        <Button
          size="md"
          isFullWidth
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
