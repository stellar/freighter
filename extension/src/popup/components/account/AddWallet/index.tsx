import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Icon } from "@stellar/design-system";
import classNames from "classnames";

import { ROUTES } from "popup/constants/routes";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

interface AddWalletProps {
  onBack: () => void;
}

export const AddWallet = ({ onBack }: AddWalletProps) => {
  const { t } = useTranslation();
  const actions = [
    {
      icon: <Icon.Activity stroke="#99D52A" />,
      color: "lime",
      title: t("Create new wallet"),
      description: t("Create a wallet from your seed phrase."),
      link: ROUTES.addAccount,
    },
    {
      icon: <Icon.Activity stroke="#D6409F" />,
      color: "purple",
      title: t("Import Stellar Secret Key"),
      description: t("Add a wallet using a secret key."),
      link: ROUTES.importAccount,
    },
    {
      icon: <Icon.ShieldPlus stroke="#3E63DD" />,
      color: "blue",
      title: t("Connect a hardware wallet"),
      description: t("Add a wallet from a hardware wallet."),
      link: ROUTES.connectWallet,
    },
  ];
  return (
    <>
      <SubviewHeader
        title={t("Add another wallet")}
        customBackAction={onBack}
        customBackIcon={<Icon.ArrowLeft />}
      />
      <View.Content hasNoTopPadding>
        <div className="AddWallet">
          {actions.map((action) => {
            const iconClasses = classNames(
              "AddWallet__row__icon",
              action.color,
            );
            return (
              <div key={action.title} className="AddWallet__row">
                <Link className="AddWallet__row-link" to={action.link}>
                  <div className={iconClasses}>{action.icon}</div>
                  <div className="AddWallet__row__title">{action.title}</div>
                  <div className="AddWallet__row__description">
                    {action.description}
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </View.Content>
    </>
  );
};
