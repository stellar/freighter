import React from "react";
import { useTranslation, Trans } from "react-i18next";
import { Button, Icon } from "@stellar/design-system";

import { XLM_RESERVE_HELP_URL } from "popup/constants/externalLinks";
import { useFundingAction } from "popup/components/account/hooks/useFundingAction";

import "./styles.scss";

export const NotFundedMessage = ({
  canUseFriendbot,
  hasInlineCta,
  publicKey,
  reloadBalances,
}: {
  canUseFriendbot: boolean;
  hasInlineCta: boolean;
  publicKey: string;
  reloadBalances: () => Promise<unknown>;
}) => {
  const { t } = useTranslation();
  const fundingAction = useFundingAction({
    canUseFriendbot,
    publicKey,
    reloadBalances,
  });

  return (
    <div className="NotFunded" data-testid="not-funded">
      <div className="NotFunded__badge">
        <Icon.Coins01 />
      </div>
      <div className="NotFunded__title">{t("Looking a little empty...")}</div>
      <div className="NotFunded__body">
        <Trans
          i18nKey="Add at least <bold>2 XLM</bold> to activate your wallet. Once funded, you'll be able to add tokens and make transactions."
          components={{ bold: <strong className="NotFunded__amount" /> }}
        />{" "}
        <a
          className="NotFunded__link"
          href={XLM_RESERVE_HELP_URL}
          rel="noreferrer"
          target="_blank"
        >
          {t("Learn more")}
        </a>
      </div>

      {/* One funding action, not two stacked, and only when this empty state is
          the one carrying it. Where the floating pill is showing instead it
          takes over the very same action, so rendering it here too would put
          two copies of it on screen. */}
      {hasInlineCta && (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          isRounded
          isLoading={fundingAction.isSubmitting}
          onClick={fundingAction.onClick}
        >
          {fundingAction.label}
        </Button>
      )}
    </div>
  );
};
