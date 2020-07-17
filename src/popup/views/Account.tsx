import React, { useEffect, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";
import { useSelector } from "react-redux";

import { getAccountBalance } from "api/internal";

import { truncatedPublicKey } from "helpers/stellar";
import { publicKeySelector } from "popup/ducks/authServices";

import { POPUP_WIDTH } from "popup/constants/dimensions";
import { COLOR_PALETTE } from "popup/constants/styles";
import { BasicButton } from "popup/basics/Buttons";

import { Toast } from "popup/components/Toast";
import { Menu } from "popup/components/Menu";

import CopyColor from "popup/assets/copy-color.png";
import StellarLogo from "popup/assets/stellar-logo.png";
import { Footer } from "popup/components/Footer";

const AccountEl = styled.div`
  width: 100%;
  max-width: ${POPUP_WIDTH}px;
  box-sizing: border-box;
  padding: 1.25rem 2rem;
`;

const PublicKeyDisplayEl = styled.div`
  position: relative;
  display: inline-block;
  padding-right: 0.45rem;
  font-size: 0.81rem;
  text-align: right;

  p {
    margin: 0;
    line-height: 2;
  }
`;

const PublicKeyEl = styled.span`
  font-size: 0.875rem;
  color: ${COLOR_PALETTE.secondaryText};
  margin-right: 1rem;
  opacity: 0.7;
`;

const CopyButtonEl = styled(BasicButton)`
  background: url(${CopyColor});
  background-size: cover;
  width: 1rem;
  height: 1rem;
`;

const AccountDetailsEl = styled.section`
  align-content: center;
  align-items: center;
  display: flex;
  padding: 2.25rem 0 8.5rem;
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
  margin: 0.3rem 0 0 -5rem;
`;

const RowEl = styled.div`
  display: flex;
  justify-content: space-between;
`;

export const Account = () => {
  const [accountBalance, setaccountBalance] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const publicKey = useSelector(publicKeySelector);

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
  return (
    <>
      <AccountEl>
        <RowEl>
          <Menu />
          <PublicKeyDisplayEl>
            <p>Your public key</p>
            <PublicKeyEl>{truncatedPublicKey(publicKey)}</PublicKeyEl>
            <CopyToClipboard text={publicKey} onCopy={() => setIsCopied(true)}>
              <CopyButtonEl />
            </CopyToClipboard>
            <CopiedToastWrapperEl>
              <Toast
                message="Copied to your clipboard 👌"
                isShowing={isCopied}
                setIsShowing={setIsCopied}
              />
            </CopiedToastWrapperEl>
          </PublicKeyDisplayEl>
        </RowEl>
        <AccountDetailsEl>
          <StellarLogoEl alt="Stellar logo" src={StellarLogo} />
          <div>
            <LumenBalanceEl>{accountBalance} XLM</LumenBalanceEl>
          </div>
        </AccountDetailsEl>
      </AccountEl>
      <Footer />
    </>
  );
};
