import React from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";

import { COLOR_PALETTE, ROUNDED_CORNERS } from "popup/constants/styles";
import { ROUTES } from "popup/constants/routes";

import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";

import { Account } from "@shared/api/types";
import CreateNewIcon from "popup/assets/create-new.svg";
import ImportNewIcon from "popup/assets/import-new.svg";

const AccountDropdownButtonEl = styled.div`
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

const AccountDropdownArrowEl = styled.span`
  border-left: 0.5rem solid transparent;
  border-right: 0.5rem solid transparent;
  border-top: 0.5rem solid ${COLOR_PALETTE.greyDark};
  margin: 0 0.75rem 0 3rem;
  width: 0;
  height: 0;
`;

interface AccountDropdownOptionsProps {
  dropdownCount: number;
  isDropdownOpen: boolean;
}

const AccountDropdownOptionsEl = styled.ul`
  background: ${COLOR_PALETTE.white};
  border-radius: 0.3125rem;
  box-shadow: 0 0.125rem 0.5rem rgba(0, 0, 0, 0.06);
  height: auto;
  max-height: ${({
    dropdownCount,
    isDropdownOpen,
  }: AccountDropdownOptionsProps) =>
    isDropdownOpen ? `${dropdownCount * 6.5}rem` : "0"};
  list-style-type: none;
  margin: 0 0 0 0.75rem;
  overflow: hidden;
  padding: 0;
  position: absolute;
  transition: max-height 0.3s ease-out;
`;

const AccountDropdownAccountEl = styled.li`
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

const AccountDropdownOptionEl = styled.li`
  padding: 0.75rem 1rem;
`;

const AccountDropdownOptionLinkEl = styled(Link)`
  color: ${COLOR_PALETTE.secondaryText};
  display: flex;
`;

const AccountDropdownOptionIconEl = styled.div`
  margin-right: 0.5rem;
  width: 1.5rem;
  text-align: center;
`;

const ImportedTagEl = () => <AccountTagEl>IMPORTED</AccountTagEl>;

interface AccountDropdownProps {
  accountDropDownRef: React.Ref<HTMLDivElement>;
  allAccounts: Array<Account>;
  currentAccountName: string;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (state: boolean) => void;
  publicKey: string;
}

export const AccountDropdown = ({
  accountDropDownRef,
  allAccounts,
  currentAccountName,
  isDropdownOpen,
  setIsDropdownOpen,
  publicKey,
}: AccountDropdownProps) => (
  <section ref={accountDropDownRef}>
    <AccountDropdownButtonEl onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
      <AccountListIdenticon
        active
        accountName={currentAccountName}
        publicKey={publicKey}
      />
      <AccountDropdownArrowEl />
    </AccountDropdownButtonEl>
    <AccountDropdownOptionsEl
      dropdownCount={allAccounts.length}
      isDropdownOpen={isDropdownOpen}
    >
      {allAccounts.length > 1 &&
        allAccounts.map(
          ({ publicKey: accountPublicKey, name: accountName, imported }) => {
            const isSelected = publicKey === accountPublicKey;

            return (
              <AccountDropdownAccountEl key={`account-${accountName}`}>
                <AccountListIdenticon
                  accountName={accountName}
                  active={isSelected}
                  checked={isSelected}
                  publicKey={accountPublicKey}
                  setIsDropdownOpen={setIsDropdownOpen}
                />
                {imported ? <ImportedTagEl /> : null}
              </AccountDropdownAccountEl>
            );
          },
        )}
      <AccountDropdownOptionEl>
        <AccountDropdownOptionLinkEl
          to={{
            pathname: ROUTES.addAccount,
            state: {
              header: "Create a new Stellar address",
              cta: "Add address",
            },
          }}
        >
          <AccountDropdownOptionIconEl>
            <img src={CreateNewIcon} alt="create new address button" />{" "}
          </AccountDropdownOptionIconEl>
          <span>Create a new Stellar address</span>
        </AccountDropdownOptionLinkEl>
      </AccountDropdownOptionEl>
      <AccountDropdownOptionEl>
        <AccountDropdownOptionLinkEl to={ROUTES.importAccount}>
          <AccountDropdownOptionIconEl>
            <img src={ImportNewIcon} alt="import a Stellar key button" />{" "}
          </AccountDropdownOptionIconEl>
          <span>Import a Stellar secret key</span>
        </AccountDropdownOptionLinkEl>
      </AccountDropdownOptionEl>
    </AccountDropdownOptionsEl>
  </section>
);
