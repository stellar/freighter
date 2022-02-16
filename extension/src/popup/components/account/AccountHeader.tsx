import React from "react";
import { useSelector } from "react-redux";
import styled from "styled-components";
import { Link } from "react-router-dom";

import { COLOR_PALETTE, ROUNDED_CORNERS } from "popup/constants/styles";
import { ROUTES } from "popup/constants/routes";

import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { Account } from "@shared/api/types";
import CreateNewIcon from "popup/assets/create-new.svg";
import ImportNewIcon from "popup/assets/import-new.svg";

const AccountHeaderSection = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  height: 5rem;
`;

const AccountHeaderButtonEl = styled.div`
  cursor: pointer;
  display: flex;
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

// const RightSectionEl = styled.div`
//   align-items: flex-end;
//   display: flex;
//   flex-direction: column;
// `;

const NetworkWrapperEl = styled.div`
  width: 6rem;
  display: flex;
  flex-flow: row nowrap;
  align-items: center;
  justify-content: right;
`;

const NetworkIconEl = styled.div`
  background: ${({ isTestnet }: { isTestnet: boolean }) =>
    isTestnet ? "var(--pal-brand-primary)" : "var(--pal-success)"};
  border-radius: 2rem;
  margin-right: 0.5rem;
  height: 0.5rem;
  width: 0.5rem;
`;
const NetworkEl = styled.div`
  font-size: 0.875rem;
  line-height: 1.5rem;
  font-weight: var(--font-weight-medium);
`;

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
  const { isTestnet } = useSelector(settingsNetworkDetailsSelector);

  return (
    <>
      <AccountHeaderSection ref={accountDropDownRef}>
        <AccountHeaderButtonEl
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <AccountListIdenticon
            active
            accountName={currentAccountName}
            publicKey={publicKey}
          />
        </AccountHeaderButtonEl>
        <NetworkWrapperEl>
          <NetworkIconEl isTestnet={isTestnet} />
          <NetworkEl>{isTestnet ? "TEST NET" : "MAIN NET"}</NetworkEl>
        </NetworkWrapperEl>
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
      </AccountHeaderSection>
    </>
  );
};
