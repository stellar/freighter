import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Button, Heading, Paragraph } from "@stellar/design-system";
import { getAccountBalances } from "@shared/api/internal";

import { allAccountsSelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

type AccountList = {
  publicKey: string;
  name: string;
  trustlines: number;
  dataEntries: number;
}[];

export const ReviewMigration = () => {
  const allAccounts = useSelector(allAccountsSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [accountList, setAccountList] = useState(
    allAccounts.map(({ publicKey, name }) => ({
      publicKey,
      name,
      trustlines: 0,
      dataEntries: 0,
    })) as AccountList,
  );

  useEffect(() => {
    console.log(setAccountList);

    const fetchAccountData = async () => {
      // eslint-disable-next-line no-plusplus
      for (let i = 0; i < accountList.length; i++) {
        const publicKey = accountList[i].publicKey;
        // eslint-disable-next-line no-await-in-loop
        const res = await getAccountBalances({ publicKey, networkDetails });
        console.log(res);
      }
    };

    fetchAccountData();
  }, [accountList, networkDetails]);

  return (
    <div className="ReviewMigration">
      <div>
        <Heading as="h1" size="md">
          Review accounts to migrate
        </Heading>
        <Paragraph size="md">
          Only accounts ready for migration will be migrated.
        </Paragraph>
      </div>
      <div>
        {accountList.map((acct) => (
          <div>
            <div>{acct.publicKey}</div>
            <div>{acct.name}</div>
            <div>{acct.trustlines} trustlines</div>
            <div>{acct.dataEntries} data entries</div>
          </div>
        ))}
      </div>
      <div className="ReviewMigration__button">
        <Button size="md" variant="secondary">
          Continue
        </Button>
      </div>
    </div>
  );
};
