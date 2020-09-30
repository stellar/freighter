import React, { useState } from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { useLocation } from "react-router-dom";
import punycode from "punycode";

import { parsedSearchParam, getUrlHostname } from "helpers/urls";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { rejectAccess, grantAccess } from "popup/ducks/access";

import { Button } from "popup/basics/Buttons";
import { SubmitButton } from "popup/basics/Forms";
import { WarningMessage } from "popup/components/WarningMessage";

import WarningShieldIcon from "popup/assets/icon-warning-shield.svg";

import "popup/metrics/access";

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

const ButtonContainerEl = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 3rem 1.25rem;
  flex-direction: row;
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
      <WarningMessage
        icon={WarningShieldIcon}
        subheader="This is the first time you interact with this domain in this browser"
      >
        <p>
          Double check the domain name, if you suspect of something, don't give
          it access.
        </p>
        <p>
          If you interacted with this domain before in this browser and are
          seeing this message, it may indicate a scam.
        </p>
      </WarningMessage>
      <SubheaderEl>{punycodedDomain} wants to know your public key</SubheaderEl>
      <TextEl>This website wants to know your public key:</TextEl>
      <ButtonContainerEl>
        <RejectButtonEl size="small" onClick={rejectAndClose}>
          Reject
        </RejectButtonEl>
        <SubmitButton
          isSubmitting={isGranting}
          size="small"
          onClick={() => grantAndClose()}
        >
          Give access
        </SubmitButton>
      </ButtonContainerEl>
    </GrantAccessEl>
  );
};
