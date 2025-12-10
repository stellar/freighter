import React from "react";
import { useSelector } from "react-redux";
import { Badge, Button, Icon } from "@stellar/design-system";
import { useTranslation } from "react-i18next";
import { MigratedAccount } from "@shared/api/types";

import { migratedAccountsSelector } from "popup/ducks/accountServices";

import {
  MigrationButton,
  MigrationHeader,
  MigrationParagraph,
  MigrationReviewHeader,
  MigrationReviewListSection,
  MigrationReviewListHeader,
  MigrationReviewDetailRow,
  MigrationReviewAccountInfo,
  MigrationReviewBadge,
} from "../basics";

import "./styles.scss";

const handleClick = () => {
  window.close();
};

const AccountListItems = ({
  migratedAccounts,
}: {
  migratedAccounts: MigratedAccount[];
}) => {
  const { t } = useTranslation();

  return (
    <>
      {migratedAccounts.map((acct) => (
        <MigrationReviewListSection key={acct.publicKey}>
          <>
            <div>
              <MigrationReviewListHeader>
                <MigrationReviewAccountInfo
                  publicKey={acct.publicKey}
                  name={acct.name}
                  isDisabled
                />
              </MigrationReviewListHeader>
            </div>
            <div className="MigrationComplete__arrow">
              <Icon.ArrowRight />
            </div>
            <div className="MigrationComplete__migrated-account">
              <MigrationReviewListHeader>
                <MigrationReviewAccountInfo
                  publicKey={acct.newPublicKey}
                  name={acct.name}
                />
              </MigrationReviewListHeader>
              <MigrationReviewDetailRow>
                <div>
                  {acct.trustlineBalances.length} {t("trustlines")}
                </div>
              </MigrationReviewDetailRow>
            </div>
            <div>
              <MigrationReviewListHeader>
                <MigrationReviewBadge>
                  {acct.isMigrated ? (
                    <Badge variant="success">{t("Migrated")}</Badge>
                  ) : (
                    <Badge variant="error">{t("Not migrated")}</Badge>
                  )}
                </MigrationReviewBadge>
              </MigrationReviewListHeader>
            </div>
          </>
        </MigrationReviewListSection>
      ))}
    </>
  );
};

export const MigrationComplete = () => {
  const { t } = useTranslation();

  const migratedAccounts = useSelector(migratedAccountsSelector);

  return (
    <div className="MigrationComplete">
      <MigrationReviewHeader>
        <MigrationHeader>{t("Migration complete")}</MigrationHeader>
        <MigrationParagraph>
          {`${t("Remember, Freighter will now display accounts related to the new backup phrase that was just created.")} ${t("Use this backup phrase from now on to use your new accounts.")} ${t("If you have accounts that were not merged, keep and use your old backup phrase to access them.")}`}
        </MigrationParagraph>
      </MigrationReviewHeader>
      <AccountListItems migratedAccounts={migratedAccounts} />
      <MigrationButton>
        <Button size="md" variant="tertiary" onClick={handleClick}>
          {t("Finish")}
        </Button>
      </MigrationButton>
    </div>
  );
};
