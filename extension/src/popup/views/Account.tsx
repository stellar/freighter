import React, { useEffect, useRef, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";

import { getAccountBalance } from "@shared/api/internal";

import { emitMetric } from "helpers/metrics";
import {
  allAccountsSelector,
  publicKeySelector,
} from "popup/ducks/authServices";

import { POPUP_WIDTH } from "constants/dimensions";
import { ROUTES } from "popup/constants/routes";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { BasicButton } from "popup/basics/Buttons";

import { Header } from "popup/components/Header";
import { AccountListIdenticon } from "popup/components/identicons/AccountListIdenticon";
import { Toast } from "popup/components/Toast";
import { Menu } from "popup/components/Menu";

import CreateNewIcon from "popup/assets/create-new.svg";
import CopyColorIcon from "popup/assets/copy-color.svg";
import ImportNewIcon from "popup/assets/import-new.svg";
import QrCode from "popup/assets/qr-code.png";
import StellarLogo from "popup/assets/stellar-logo.png";
import { Footer } from "popup/components/Footer";

import "popup/metrics/authServices";
import { COLOR_PALETTE, ROUNDED_CORNERS } from "popup/constants/styles";

const AccountEl = styled.div`
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  box-sizing: border-box;
  padding: 1.25rem 2rem;
`;

const AccountHeaderEl = styled.div`
  align-items: center;
  background: ${COLOR_PALETTE.white};
  display: flex;
  font-size: 0.81rem;
  justify-content: space-between;
  padding: 0 1rem;
`;

const AccountDropdownButtonEl = styled.div`
  align-items: center;
  border: 1px solid ${COLOR_PALETTE.greyFaded};
  border-radius: 5rem;
  cursor: pointer;
  display: flex;
  margin: 0.875rem 0;
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
  padding: 0.75rem 0 0.75rem 1rem;
  width: 16rem;
`;

const AccountDropdownOptionEl = styled.li`
  padding: 0.75rem 1rem;
`;

const AccountTagEl = styled.span`
  background: ${COLOR_PALETTE.greyFaded};
  border-radius: ${ROUNDED_CORNERS};
  color: ${COLOR_PALETTE.greyDark};
  font-size: 0.625rem;
  height: 1rem;
  line-height: 1.1rem;
  padding: 0 0.75rem;
  margin: 1rem 0 0 1rem;
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

const CopyButtonEl = styled(BasicButton)`
  color: ${COLOR_PALETTE.primary};
  display: flex;
  padding: 0;

  img {
    margin-right: 0.5rem;
    width: 1rem;
    height: 1rem;
  }
`;

const QrButton = styled(BasicButton)`
  background: url(${QrCode});
  background-size: cover;
  width: 1rem;
  height: 1rem;
  margin-right: 0.5rem;
  vertical-align: text-top;
`;

const VerticalCenterLink = styled(Link)`
  vertical-align: middle;
`;

const AccountDetailsEl = styled.section`
  align-content: center;
  align-items: center;
  display: flex;
  padding: 2rem 0 6rem;
  justify-content: space-evenly;
`;

const StellarLogoEl = styled.img`
  height: 6.1rem;
  width: 7.3rem;
`;

const LumenBalanceEl = styled.h2`
  font-size: 1.43rem;
  font-weight: 300;
`;

const CopiedToastWrapperEl = styled.div`
  margin: 5rem 0 0 -2rem;
  position: absolute;
  right: 15rem;
`;

const ImportedTagEl = () => <AccountTagEl>IMPORTED</AccountTagEl>;

export const Account = () => {
  const [accountBalance, setaccountBalance] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const publicKey = useSelector(publicKeySelector);
  const allAccounts = useSelector(allAccountsSelector);
  const accountDropDownRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let res = { balance: "" };
    const fetchAccountBalance = async () => {
      try {
        res = await getAccountBalance(publicKey);
      } catch (e) {
        console.log(e);
      }
      const { balance } = res;
      setaccountBalance(Number(balance).toFixed(2));
    };
    fetchAccountBalance();
  }, [publicKey]);

  const closeDropdown = (e: React.ChangeEvent<any>) => {
    if (
      accountDropDownRef.current &&
      !accountDropDownRef.current.contains(e.target)
    ) {
      setIsDropdownOpen(false);
    }
  };

  const { name: currentAccountName } = allAccounts.find(
    ({ publicKey: accountPublicKey }) => accountPublicKey === publicKey,
  ) || { publicKey: "", name: "" };

  return accountBalance ? (
    <section onClick={closeDropdown}>
      <Header>
        <Menu />
      </Header>
      <AccountHeaderEl>
        <section ref={accountDropDownRef}>
          <AccountDropdownButtonEl
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
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
                ({
                  publicKey: accountPublicKey,
                  name: accountName,
                  imported,
                }) => {
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
        <CopyToClipboard
          text={publicKey}
          onCopy={() => {
            setIsCopied(true);
            emitMetric(METRIC_NAMES.copyPublickKey);
          }}
        >
          <CopyButtonEl>
            <img src={CopyColorIcon} alt="copy button" /> Copy
          </CopyButtonEl>
        </CopyToClipboard>
        <CopiedToastWrapperEl>
          <Toast
            message="Copied to your clipboard 👌"
            isShowing={isCopied}
            setIsShowing={setIsCopied}
          />
        </CopiedToastWrapperEl>
        <VerticalCenterLink to={ROUTES.viewPublicKey}>
          <QrButton /> Details
        </VerticalCenterLink>
      </AccountHeaderEl>
      <AccountEl>
        <AccountDetailsEl>
          <StellarLogoEl alt="Stellar logo" src={StellarLogo} />
          <div>
            <LumenBalanceEl>{accountBalance} XLM</LumenBalanceEl>
          </div>
        </AccountDetailsEl>
      </AccountEl>
      <Footer />
    </section>
  ) : null;
};
