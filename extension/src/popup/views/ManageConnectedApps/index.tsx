import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector, useDispatch } from "react-redux";
import { Button, Select } from "@stellar/design-system";

import { saveAllowList, settingsSelector } from "popup/ducks/settings";
import { publicKeySelector } from "popup/ducks/accountServices";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { PunycodedDomain } from "popup/components/PunycodedDomain";
import { NetworkIcon } from "popup/components/manageNetwork/NetworkIcon";

import { View } from "popup/basics/layout/View";
import { RemoveButton } from "popup/basics/buttons/RemoveButton";

import "./styles.scss";

export const ManageConnectedApps = () => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { allowList, networkDetails, networksList } =
    useSelector(settingsSelector);
  const publicKey = useSelector(publicKeySelector);
  const [selectedNetworkName, setSelectedNetworkName] = useState(
    networkDetails.networkName,
  );
  const [selectedAllowlist, setSelectedAllowlist] = useState(
    allowList?.[networkDetails.networkName]?.[publicKey] || [],
  );

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedNetworkName(e.target.value);
  };

  const handleRemove = (domainToRemove: string) => {
    dispatch(
      saveAllowList({
        domain: domainToRemove,
        networkName: selectedNetworkName,
      }),
    );
  };

  const handleRemoveAll = () => {
    // eslint-disable-next-line @typescript-eslint/prefer-for-of
    for (let i = 0; i < selectedAllowlist.length; i += 1) {
      const domain = selectedAllowlist[i];
      dispatch(saveAllowList({ domain, networkName: selectedNetworkName }));
    }
  };

  useEffect(() => {
    setSelectedAllowlist(allowList?.[selectedNetworkName]?.[publicKey] || []);
  }, [
    setSelectedAllowlist,
    allowList,
    publicKey,
    selectedNetworkName,
    networkDetails,
    networksList,
  ]);

  return (
    <React.Fragment>
      <SubviewHeader title={t("Connected apps")} />
      <View.Content hasNoTopPadding>
        <div className="ManageConnectedApps">
          <div className="ManageConnectedApps__select-wrapper">
            <Select
              data-testid="manage-connected-apps-select"
              fieldSize="sm"
              id="select"
              className="ManageConnectedApps__select"
              onChange={handleSelectChange}
            >
              {networksList.map(({ networkName }) => (
                <option
                  value={networkName}
                  key={networkName}
                  selected={networkName === selectedNetworkName}
                >
                  {networkName}
                </option>
              ))}
            </Select>
          </div>
          <div className="ManageConnectedApps__network">
            <NetworkIcon
              index={networksList.findIndex(
                ({ networkName: currNetworkName }) =>
                  currNetworkName === selectedNetworkName,
              )}
            />
          </div>
          {selectedAllowlist.length ? (
            <div className="ManageConnectedApps__wrapper">
              <div className="ManageConnectedApps__list">
                {selectedAllowlist.map(
                  (allowedDomain) =>
                    allowedDomain && (
                      <div
                        className="ManageConnectedApps__row"
                        key={allowedDomain}
                      >
                        <PunycodedDomain domain={allowedDomain} isRow />
                        <RemoveButton
                          onClick={() => handleRemove(allowedDomain)}
                        />
                      </div>
                    ),
                )}
              </div>

              <Button
                size="md"
                variant="error"
                isFullWidth
                onClick={handleRemoveAll}
              >
                {t("Disconnect all")}
              </Button>
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
