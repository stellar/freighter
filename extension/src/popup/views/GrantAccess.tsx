import React, { useState } from "react";
import { useDispatch } from "react-redux";
import styled, { css } from "styled-components";
import { useLocation } from "react-router-dom";
import punycode from "punycode";

import {
  removeQueryParam,
  parsedSearchParam,
  getUrlHostname,
} from "helpers/urls";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { rejectAccess, grantAccess } from "popup/ducks/access";

import { Button } from "popup/basics/Buttons";
import { SubmitButton } from "popup/basics/Forms";
import { WarningMessage } from "popup/components/WarningMessage";

import WarningShieldIcon from "popup/assets/icon-warning-shield.svg";

import "popup/metrics/access";

const WHITELIST_ID = "whitelist";

const GrantAccessEl = styled.div`
  padding: 1.5rem 1.875rem;
`;
const HeaderEl = styled.h1`
  color: ${COLOR_PALETTE.primary}};
  font-weight: ${FONT_WEIGHT.light};
  margin: 0;
`;
const SubheaderEl = styled.h3`
  font-weight: ${FONT_WEIGHT.bold};
  font-size: 0.95rem;
  letter-spacing: 0.1px;
  color: ${COLOR_PALETTE.primary}};
`;
const TextEl = styled.p`
  font-size: 1.15rem;
  text-align: center;
  line-height: 1.9;
  padding: 1.7rem 2rem;
  margin: 0;
`;

interface ButtonContainerProps {
  isColumnDirection: boolean;
}

const ButtonContainerEl = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 3rem 1.25rem;
  flex-direction: row;

  ${({ isColumnDirection }: ButtonContainerProps) =>
    isColumnDirection &&
    css`
      flex-direction: column;
      padding: 0 1.25rem;

      button {
        width: 100%;
        margin-bottom: 0.625rem;
      }
    `}
`;
const RejectButtonEl = styled(Button)`
  background: ${COLOR_PALETTE.text};
`;

export const GrantAccess = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const [isGranting, setIsGranting] = useState(false);

  const { url } = parsedSearchParam(location.search);
  const hostname = getUrlHostname(url);
  const punycodedDomain = punycode.toASCII(hostname);
  const whitelistStr = localStorage.getItem(WHITELIST_ID) || "";
  const whitelist = whitelistStr.split(",");
  const isDomainWhiteListed = whitelist.includes(
    removeQueryParam(punycodedDomain),
  );

  const rejectAndClose = () => {
    dispatch(rejectAccess());
    window.close();
  };

  const grantAndClose = async () => {
    setIsGranting(true);
    await dispatch(grantAccess(url));
    window.close();
  };

  return (
    <GrantAccessEl>
      <HeaderEl>Share public key</HeaderEl>
      {!isDomainWhiteListed ? (
        <WarningMessage
          icon={WarningShieldIcon}
          subheader="This is the first time you interact with this domain in this browser"
        >
          <p>
            Double check the domain name, if you suspect of something, don't
            give it access.
          </p>
          <p>
            If you interacted with this domain before in this browser and are
            seeing this message, it may indicate a scam.
          </p>
        </WarningMessage>
      ) : null}
      <SubheaderEl>{punycodedDomain} wants to know your public key</SubheaderEl>
      <TextEl>This website wants to know your public key:</TextEl>
      <ButtonContainerEl isColumnDirection={!isDomainWhiteListed}>
        <SubmitButton
          isSubmitting={isGranting}
          size="small"
          onClick={() => grantAndClose()}
        >
          {isDomainWhiteListed
            ? "Confirm"
            : "Trust this domain and share public key"}
        </SubmitButton>
        <RejectButtonEl size="small" onClick={rejectAndClose}>
          Reject
        </RejectButtonEl>
      </ButtonContainerEl>
    </GrantAccessEl>
  );
};
