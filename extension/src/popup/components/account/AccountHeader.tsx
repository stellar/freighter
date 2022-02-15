import React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { Link } from "react-router-dom";

import { COLOR_PALETTE, ROUNDED_CORNERS } from "popup/constants/styles";
import { ROUTES } from "popup/constants/routes";

import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { Account } from "@shared/api/types";
import AccountHeaderIcon from "popup/assets/icon-dropdown-arrow.svg";
import CreateNewIcon from "popup/assets/create-new.svg";
import ImportNewIcon from "popup/assets/import-new.svg";

const AccountHeaderButtonEl = styled.div`
  align-items: center;
  border: 1px solid ${COLOR_PALETTE.greyFaded};
  border-radius: 5rem;
  cursor: pointer;
  display: flex;
  margin: 0.875rem 0;
  max-height: 3.8125rem;
  max-width: 15.5rem;
  padding: 0.75rem;
`;

const AccountHeaderArrowEl = styled.img`
  margin: 0 0.75rem 0 3rem;
`;

interface AccountHeaderOptionsProps {
  dropdownCount: number;
  isDropdownOpen: boolean;
}

const AccountHeaderOptionsEl = styled.ul`
  background: ${COLOR_PALETTE.white};
  border-radius: 0.3125rem;
  box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.06);
  height: auto;
  max-height: ${({
    dropdownCount,
    isDropdownOpen,
  }: AccountHeaderOptionsProps) =>
    isDropdownOpen ? `${dropdownCount * 6.5}rem` : "0"};
  list-style-type: none;
  margin: 0;
  overflow: hidden;
  padding: 0;
  position: absolute;
  transition: max-height 0.3s ease-out;
`;

const AccountHeaderAccountEl = styled.li`
  border-bottom: 1px solid ${COLOR_PALETTE.greyFaded};
  display: flex;
  padding: 0.75rem 0.2rem 0.75rem 1rem;
  width: 16rem;
`;

const AccountTagEl = styled.span`
  background: ${COLOR_PALETTE.greyFaded};
  border-radius: ${ROUNDED_CORNERS};
  color: ${COLOR_PALETTE.greyDark};
  font-size: 0.625rem;
  height: 1rem;
  line-height: 1.1rem;
  padding: 0 0.75rem;
  margin: 1.1rem 0 0 0.75rem;
`;

const AccountHeaderOptionEl = styled.li`
  padding: 0.75rem 1rem;
`;

const AccountHeaderOptionLinkEl = styled(Link)`
  color: ${COLOR_PALETTE.secondaryText};
  display: flex;
`;

const AccountHeaderOptionIconEl = styled.div`
  margin-right: 0.5rem;
  width: 1.5rem;
  text-align: center;
`;

const RightSectionEl = styled.div`
  align-items: flex-end;
  display: flex;
  flex-direction: column;
`;

const NetworkWrapperEl = styled.div``;
const NetworkIconEl = styled.div`
  background: ${({ isTestnet }: { isTestnet: boolean }) =>
    isTestnet
      ? COLOR_PALETTE.testNetworkIcon
      : COLOR_PALETTE.publicNetworkIcon};
  border-radius: 2rem;
  height: 0.6875rem;
  margin-right: 0.5rem;
  position: relative;
  width: 0.6875rem;
`;
const NetworkEl = styled.div``;

const ImportedTagEl = () => <AccountTagEl>IMPORTED</AccountTagEl>;

interface AccountHeaderProps {
  accountDropDownRef: React.Ref<HTMLDivElement>;
  allAccounts: Array<Account>;
  currentAccountName: string;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (state: boolean) => void;
  publicKey: string;
}

export const AccountHeader = ({
  accountDropDownRef,
  allAccounts,
  currentAccountName,
  isDropdownOpen,
  setIsDropdownOpen,
  publicKey,
}: AccountHeaderProps) => {
  const { isTestnet, networkName } = useSelector(
    settingsNetworkDetailsSelector,
  );
  return (
    <>
      <section ref={accountDropDownRef}>
        <AccountHeaderButtonEl
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <AccountListIdenticon
            active
            accountName={currentAccountName}
            publicKey={publicKey}
          />
          <AccountHeaderArrowEl src={AccountHeaderIcon} alt="dropdown icon" />
        </AccountHeaderButtonEl>
        <AccountHeaderOptionsEl
          dropdownCount={allAccounts.length}
          isDropdownOpen={isDropdownOpen}
        >
          {allAccounts.length > 1 &&
            allAccounts.map(
              ({
                publicKey: accountPublicKey,
                name: accountName,
                imported,
              }) => {
                const isSelected = publicKey === accountPublicKey;

                return (
                  <AccountHeaderAccountEl key={`account-${accountName}`}>
                    <AccountListIdenticon
                      accountName={accountName}
                      active={isSelected}
                      checked={isSelected}
                      publicKey={accountPublicKey}
                      setIsDropdownOpen={setIsDropdownOpen}
                    />
                    {imported ? <ImportedTagEl /> : null}
                  </AccountHeaderAccountEl>
                );
              },
            )}
          <AccountHeaderOptionEl>
            <AccountHeaderOptionLinkEl
              to={{
                pathname: ROUTES.addAccount,
                state: {
                  header: "Create a new Stellar address",
                  cta: "Add address",
                },
              }}
            >
              <AccountHeaderOptionIconEl>
                <img src={CreateNewIcon} alt="create new address button" />{" "}
              </AccountHeaderOptionIconEl>
              <span>Create a new Stellar address</span>
            </AccountHeaderOptionLinkEl>
          </AccountHeaderOptionEl>
          <AccountHeaderOptionEl>
            <AccountHeaderOptionLinkEl to={ROUTES.importAccount}>
              <AccountHeaderOptionIconEl>
                <img src={ImportNewIcon} alt="import a Stellar key button" />{" "}
              </AccountHeaderOptionIconEl>
              <span>Import a Stellar secret key</span>
            </AccountHeaderOptionLinkEl>
          </AccountHeaderOptionEl>
        </AccountHeaderOptionsEl>
      </section>
      <RightSectionEl>
        <NetworkWrapperEl>
          <NetworkIconEl isTestnet={isTestnet} />
          <NetworkEl>{networkName}</NetworkEl>
        </NetworkWrapperEl>
      </RightSectionEl>
    </>
  );
};
