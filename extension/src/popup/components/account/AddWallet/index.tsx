import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Icon } from "@stellar/design-system";

import { ROUTES } from "popup/constants/routes";

import "./styles.scss";

/**
 * The three ways to add a wallet. Renders as a bare list: it is a body state of
 * the account sheet, which supplies the header, so it must not open a `View` of
 * its own.
 */
export const AddWallet = () => {
  const { t } = useTranslation();
  const actions = [
    {
      icon: <Icon.PlusCircle />,
      title: t("Create a new wallet"),
      description: t("Create a wallet from your seed phrase"),
      link: ROUTES.addAccount,
    },
    {
      icon: <Icon.Download01 />,
      title: t("Import a Stellar secret key"),
      description: t("Add a wallet using a secret key"),
      link: ROUTES.importAccount,
    },
    {
      icon: <Icon.UsbFlashDrive />,
      title: t("Connect a hardware wallet"),
      description: t("Add a wallet from a hardware wallet"),
      link: ROUTES.connectWallet,
    },
  ];

  return (
    <div className="AddWallet">
      {actions.map((action) => (
        <Link className="AddWallet__row" key={action.title} to={action.link}>
          <div className="AddWallet__row__icon">{action.icon}</div>
          <div className="AddWallet__row__title">{action.title}</div>
          <div className="AddWallet__row__description">
            {action.description}
          </div>
        </Link>
      ))}
    </div>
  );
};
