import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Icon } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { ScreenTitle } from "popup/components/ScreenTitle";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

/**
 * The ways to add a wallet, opened from the account switcher: create, import
 * a further recovery phrase, import a secret key, or connect a hardware
 * wallet. None of them replaces the wallet.
 */
export const AddWallet = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const actions = [
    {
      icon: <Icon.Plus />,
      title: t("Create new wallet"),
      description: t("Using an existing or new recovery phrase"),
      link: ROUTES.createWallet,
      testId: "add-wallet-create",
    },
    {
      icon: <Icon.Passcode />,
      title: t("Import Recovery Phrase"),
      description: t("Import wallets using a recovery phrase."),
      link: ROUTES.importRecoveryPhrase,
      testId: "add-wallet-import-phrase",
    },
    {
      icon: <Icon.Key01 />,
      title: t("Import Secret Key"),
      description: t("Import a wallet using its secret key."),
      link: ROUTES.importAccount,
      testId: "add-wallet-import-secret-key",
    },
    {
      icon: <Icon.UsbFlashDrive />,
      title: t("Connect Hardware Wallet"),
      description: t("Connect your hardware wallet."),
      link: ROUTES.connectWallet,
      testId: "add-wallet-connect-hardware",
    },
  ];

  return (
    <React.Fragment>
      <SubviewHeader
        title=""
        customBackIcon={<Icon.X />}
        customBackAction={() => navigateTo(ROUTES.account, navigate)}
      />
      <View.Content hasNoTopPadding>
        <ScreenTitle
          title={t("Add account")}
          subtitle={t("Choose how to add a wallet.")}
        />
        <div className="AddWallet">
          {actions.map((action) => (
            <Link
              className="AddWallet__row"
              key={action.link}
              to={action.link}
              data-testid={action.testId}
            >
              <div className="AddWallet__row__icon">{action.icon}</div>
              <div className="AddWallet__row__text">
                <div className="AddWallet__row__title">{action.title}</div>
                <div className="AddWallet__row__description">
                  {action.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </View.Content>
    </React.Fragment>
  );
};
