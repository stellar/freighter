import React, { useState } from "react";
import { Button, Notification, Paragraph } from "@stellar/design-system";

import { MigrationHeader, MigrationParagraph } from "../basics";

import "./styles.scss";

export const AccountMigrationStart = () => {
  const [isConfirmed, setIsConfirmed] = useState(false);

  return isConfirmed ? (
    <div className="AccountMigrationStart">
      <MigrationHeader>
        Make sure you have your 12 word backup phrase{" "}
      </MigrationHeader>
      <div>
        <Paragraph size="md">
          At the end of this process, Freighter will only display accounts
          related to the new backup phrase. You’ll still be able to import your
          current backup phrase into Freighter and control current accounts as
          long as they were not merged into the new accounts.
        </Paragraph>
        <Notification title="Important, Please Read" variant="warning">
          Make sure you have your current 12 words backup phrase before
          continuing.
        </Notification>
      </div>
      <div className="AccountMigrationStart__button">
        <Button size="md" variant="secondary">
          Continue
        </Button>
      </div>
    </div>
  ) : (
    <div className="AccountMigrationStart">
      <MigrationHeader>Account Migration</MigrationHeader>
      <div className="AccountMigrationStart__body">
        <MigrationParagraph>
          In this process, Freighter will create a new backup phrase for you and
          migrate your lumens, trustlines, and assets to the new account.
        </MigrationParagraph>
        <MigrationParagraph>
          You can choose to merge your current account into the new accounts
          after the migration, which will effectively destroy your current
          account. Merging is optional and will allow you to send your current
          account’s funding lumens to the new accounts.
        </MigrationParagraph>
      </div>
      <div className="AccountMigrationStart__button">
        <Button
          size="md"
          variant="secondary"
          onClick={() => setIsConfirmed(true)}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
