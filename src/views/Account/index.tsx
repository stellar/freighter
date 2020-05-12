import React, { useEffect, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";
import { publicKeySelector } from "ducks/authServices";
import { useSelector } from "react-redux";
import { getAccountBalance } from "services";

const PublicKeyDisplay = styled.p`
  text-overflow: ellipsis;
  overflow: hidden;
`;

const Account = () => {
  const [accountBalance, setaccountBalance] = useState("");
  const publicKey = useSelector(publicKeySelector);

  useEffect(() => {
    let res = { balance: "" };
    const fetchMnemonicPhrase = async () => {
      try {
        res = await getAccountBalance(publicKey);
      } catch (e) {
        console.log(e);
      }
      const { balance: fetchAccountBalance } = res;
      setaccountBalance(fetchAccountBalance);
    };
    fetchMnemonicPhrase();
  }, [publicKey]);
  return (
    <>
      <div>
        <h2>Public Key:</h2>
        <PublicKeyDisplay>{publicKey}</PublicKeyDisplay>
        <CopyToClipboard text={publicKey}>
          <button>Copy</button>
        </CopyToClipboard>
      </div>
      <div>
        <h2>Account Balance:</h2>
        <p>{accountBalance}</p>
      </div>
    </>
  );
};

export default Account;
