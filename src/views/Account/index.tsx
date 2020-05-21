import React, { useEffect, useState } from "react";
import CopyToClipboard from "react-copy-to-clipboard";
import styled from "styled-components";
import { publicKeySelector } from "ducks/authServices";
import { useSelector } from "react-redux";
import { getAccountBalance } from "api";
import Tooltip from "components/Tooltip";

const StyledTooltip = styled(Tooltip)``;

const PublicKeyDisplay = styled.p`
  cursor: pointer;
  text-overflow: ellipsis;
  overflow: hidden;
  color: ${({ isBlurred }: { isBlurred: boolean }) =>
    isBlurred ? "transparent" : "black"};
  text-shadow: ${({ isBlurred }: { isBlurred: boolean }) =>
    isBlurred ? "0 0 5px rgba(0, 0, 0, 0.5)" : "null"};

  &:hover + ${StyledTooltip} {
    visibility: visible;
  }
`;

const Account = () => {
  const [accountBalance, setaccountBalance] = useState("");
  const [isBlurred, setIsBlurred] = useState(true);
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

        <PublicKeyDisplay
          onClick={() => setIsBlurred(false)}
          isBlurred={isBlurred}
        >
          {publicKey}
        </PublicKeyDisplay>
        {isBlurred ? <StyledTooltip text="Click to reveal public key" /> : null}
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
