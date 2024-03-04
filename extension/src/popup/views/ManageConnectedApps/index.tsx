import React from "react";

import { useSelector, useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { PillButton } from "popup/basics/buttons/PillButton";

import { saveAllowList, settingsSelector } from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";

import "./styles.scss";

export const ManageConnectedApps = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { allowList } = useSelector(settingsSelector);

  const handleRemove = (domainToRemove: string) => {
    const allowListToSave = allowList.filter((item) => item !== domainToRemove);

    dispatch(
      saveAllowList({
        allowList: allowListToSave,
      }),
    );
  };

  return (
    <React.Fragment>
      <SubviewHeader title="Manage Connected Apps" />
      <View.Content>
        <div className="ManageConnectedApps">
          {allowList.length ? (
            <div className="ManageConnectedApps__wrapper">
              <div className="ManageConnectedApps__content">
                {allowList.map(
                  (allowedDomain) =>
                    allowedDomain && (
                      <div
                        className="ManageConnectedApps__row"
                        key={allowedDomain}
                      >
                        <div>{allowedDomain}</div>
                        <PillButton onClick={() => handleRemove(allowedDomain)}>
                          {t("Remove")}
                        </PillButton>
                      </div>
                    ),
                )}
              </div>
            </div>
          ) : (
            <div className="ManageConnectedApps__empty">
              No connected apps found
            </div>
          )}
        </div>
      </View.Content>
    </React.Fragment>
  );
};
