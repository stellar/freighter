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

import "popup/metrics/access";

const WHITELIST_ID = "whitelist";

const GrantAccessEl = styled.div`
  padding: 2.25rem 2.5rem;
`;
const HeaderEl = styled.h1`
  color: ${COLOR_PALETTE.primary}};
  font-weight: ${FONT_WEIGHT.light};
  margin: 1rem 0 0.75rem;
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
const WarningMessageEl = styled.div`
  background-color: ${COLOR_PALETTE.errorFaded};
  padding: 0.5rem 1rem;
  text-align: center;
  font-size: 0.85rem;
`;

export const GrantAccess = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { url } = parsedSearchParam(location.search);
  const hostname = getUrlHostname(url);
  const punycodedDomain = punycode.toASCII(hostname);
  const [isGranting, setIsGranting] = useState(false);

  const whitelistStr = localStorage.getItem(WHITELIST_ID) || "";
  const whitelist = whitelistStr.split(",");
  const isDomainWhiteListed = whitelist.includes(removeQueryParam(url));

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
      <HeaderEl>Connection request</HeaderEl>
      <SubheaderEl>{punycodedDomain} wants to know your public key</SubheaderEl>
      {!isDomainWhiteListed ? (
        <WarningMessageEl>
          <p>
            <strong>
              This is the first time you interact with this domain in this
              computer.
            </strong>
          </p>
          <p>
            Make sure the domain name above reads as it should, if you suspect
            of something, don't give it permission. If you‘ve interacted with this
            domain before in this browser, this might indicate a scam.
          </p>
        </WarningMessageEl>
      ) : null}
      <TextEl>
        This site is asking for access to the public key associated with this
        Lyra wallet. Only share your information with websites you trust.{" "}
      </TextEl>
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
