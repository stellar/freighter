import React, { useEffect, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";
import { publicKeySelector } from "popup/ducks/authServices";
import { useSelector } from "react-redux";
import { getAccountBalance } from "api/internal";
import { COLOR_PALETTE } from "popup/styles";
import { Button } from "popup/styles/Basics";
import CopyColor from "popup/assets/copy-color.png";
import StellarLogo from "popup/assets/stellar-logo.png";

const PublicKeyDisplay = styled.div`
  display: inline-block;
  float: right;
  font-size: 0.81rem;
  line-height: 1rem;
  margin: 0.75rem 2.4rem 0 0;
  text-align: right;
`;

const PublicKeyEl = styled.span`
  font-size: 0.875rem;
  color: ${COLOR_PALETTE.secondaryText};
  margin-right: 1rem;
  opacity: 0.7;
`;

const CopyButton = styled(Button)`
  background: url(${CopyColor});
  background-size: cover;
  width: 1rem;
  height: 1rem;
`;

const AccountDetails = styled.section`
  align-content: center;
  align-items: center;
  display: flex;
  margin-top: 3.75rem;
  justify-content: center;
`;

const StellarLogoEl = styled.img`
  height: 6.1rem;
  margin-right: 2.75rem;
  width: 7.3rem;
`;

const AccountBalance = styled.div``;

const LumenBalance = styled.h2`
  font-size: 1.43rem;
  font-weight: 300;
`;

// const DollarBalance = styled.h3``;

const truncatedPublicKey = (publicKey: string) =>
  `${publicKey.slice(0, 4)}...${publicKey.slice(-4)}`;

const Account = () => {
  const [accountBalance, setaccountBalance] = useState("");
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
      <PublicKeyDisplay>
        <p>Your public key</p>
        <PublicKeyEl>{truncatedPublicKey(publicKey)}</PublicKeyEl>
        <CopyToClipboard text={publicKey}>
          <CopyButton />
        </CopyToClipboard>
      </PublicKeyDisplay>
      <AccountDetails>
        <StellarLogoEl alt="Stellar logo" src={StellarLogo} />
        <AccountBalance>
          <LumenBalance>{accountBalance} XLM</LumenBalance>
          <p>{accountBalance}</p>
        </AccountBalance>
      </AccountDetails>
    </>
  );
};

export default Account;
