import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { AppDispatch } from "popup/App";
import { ROUTES } from "popup/constants/routes";
import { fundAccount } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { navigateTo } from "popup/helpers/navigate";
import { isMainnet } from "helpers/stellar";

/**
 * The single funding action an unfunded account is offered.
 *
 * Two surfaces can present it -- the Tokens empty state and the floating add
 * pill -- and only ever one at a time. Deriving the label and the action here
 * keeps the friendbot/Add-XLM branch in one place, so the pill can never end
 * up offering something different from the empty state it replaces.
 */
export const useFundingAction = ({
  canUseFriendbot,
  publicKey,
  reloadBalances,
}: {
  canUseFriendbot: boolean;
  publicKey: string;
  reloadBalances: () => Promise<unknown>;
}) => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fundWithFriendbot = async () => {
    setIsSubmitting(true);
    try {
      await dispatch(fundAccount({ publicKey }));
      await reloadBalances();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Where a friendbot exists it *is* the way to fund the account, so it
  // replaces "Add XLM" rather than sitting alongside it.
  if (canUseFriendbot) {
    return {
      label: t("Fund with Friendbot"),
      isSubmitting,
      onClick: fundWithFriendbot,
    };
  }

  return {
    label: t("Add XLM"),
    isSubmitting: false,
    onClick: async () =>
      isMainnet(networkDetails)
        ? navigateTo(ROUTES.addFunds, navigate, "?isAddXlm=true")
        : navigateTo(ROUTES.viewPublicKey, navigate),
  };
};
