import React from "react";
import { useSelector } from "react-redux";
import { Redirect } from "react-router-dom";

import { ROUTES } from "popup/constants/routes";
import { sortBalances } from "popup/helpers/account";
import { transactionSubmissionSelector } from "popup/ducks/transactionSubmission";

export const PreapprovedAssets = () => {
  const { accountBalances } = useSelector(transactionSubmissionSelector);
  console.log(accountBalances);

  if (!accountBalances.balances) {
    return (
      <Redirect
        to={{
          pathname: ROUTES.account,
        }}
      />
    );
  }

  const balances = sortBalances(accountBalances.balances);
  console.log(balances);

  return (
    <div>
      {balances.map(({ token: { code } }) => (
        <div key={code}>{code}</div>
      ))}
    </div>
  );
};
