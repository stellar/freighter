import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";

import { saveAllowList, settingsSelector } from "popup/ducks/settings";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { View } from "popup/basics/layout/View";
import { RemoveButton } from "popup/basics/buttons/RemoveButton";

import "./styles.scss";

export const ManageConnectedApps = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
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
      <SubviewHeader title={t("Connected apps")} />
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
                        <RemoveButton
                          onClick={() => handleRemove(allowedDomain)}
                        />
                      </div>
                    ),
                )}
              </div>
            </div>
          ) : (
            <div className="ManageConnectedApps__empty">
              {t("No connected apps found")}
            </div>
          )}
        </div>
      </View.Content>
    </React.Fragment>
  );
};
