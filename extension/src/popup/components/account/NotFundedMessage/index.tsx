import React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Button } from "@stellar/design-system";
import { Formik, Form } from "formik";

import { fundAccount } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
import { AppDispatch } from "popup/App";
import { isMainnet } from "helpers/stellar";
import { HomeEmptyState } from "popup/components/account/HomeEmptyState";

export const NotFundedMessage = ({
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

  const handleFundAccount = async () => {
    await dispatch(fundAccount({ publicKey }));
    await reloadBalances();
  };

  return (
    <HomeEmptyState
      title={t("Activate your wallet")}
      description={t("Add at least 2 XLM to get started")}
      data-testid="not-funded"
    >
      {/* One funding action, not two stacked. Where a friendbot exists it is
          the way to fund the account, so it replaces "Add XLM" rather than
          sitting under it — and wears the same style, since it is now the
          primary action of this empty state rather than a secondary offer. */}
      {canUseFriendbot ? (
        <Formik initialValues={{}} onSubmit={handleFundAccount}>
          {({ isSubmitting }) => (
            <Form>
              <Button
                variant="secondary"
                size="lg"
                isRounded
                isLoading={isSubmitting}
              >
                {t("Fund with Friendbot")}
              </Button>
            </Form>
          )}
        </Formik>
      ) : (
        <Button
          variant="secondary"
          size="lg"
          isRounded
          onClick={() =>
            isMainnet(networkDetails)
              ? navigateTo(ROUTES.addFunds, navigate, "?isAddXlm=true")
              : navigateTo(ROUTES.viewPublicKey, navigate)
          }
        >
          {t("Add XLM")}
        </Button>
      )}
    </HomeEmptyState>
  );
};
