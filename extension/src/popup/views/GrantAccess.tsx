import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import styled from "styled-components";
import { useLocation } from "react-router-dom";

import { getUrlHostname, parsedSearchParam } from "helpers/urls";
import { truncatedPublicKey } from "helpers/stellar";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { rejectAccess, grantAccess } from "popup/ducks/access";
import { publicKeySelector } from "popup/ducks/authServices";

import { Button } from "popup/basics/Buttons";
import { SubmitButton } from "popup/basics/Forms";
import { WarningMessage } from "popup/components/WarningMessage";
import { PunycodedDomain } from "popup/components/PunycodedDomain";

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
const PublicKeyEl = styled.p`
  color: ${COLOR_PALETTE.primary}};
`;
const ButtonContainerEl = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 3rem 0;
  flex-direction: row;
`;
const RejectButtonEl = styled(Button)`
  background: ${COLOR_PALETTE.text};
  width: 9.75rem;
`;
const SharePublicKeyButtonEl = styled(SubmitButton)`
  width: 12.25rem;
`;

export const GrantAccess = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const [isGranting, setIsGranting] = useState(false);

  const { url } = parsedSearchParam(location.search);

  const domain = getUrlHostname(url);
  const publicKey = useSelector(publicKeySelector);

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
        subheader="This is the first time you've interacted with this domain in this browser"
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
      <PunycodedDomain domain={domain} />
      <SubheaderEl>This website wants to know your public key:</SubheaderEl>
      <PublicKeyEl>&#9675; {truncatedPublicKey(publicKey)}</PublicKeyEl>
      <ButtonContainerEl>
        <RejectButtonEl size="small" onClick={rejectAndClose}>
          Reject
        </RejectButtonEl>
        <SharePublicKeyButtonEl
          isSubmitting={isGranting}
          size="small"
          onClick={() => grantAndClose()}
        >
          Share public key
        </SharePublicKeyButtonEl>
      </ButtonContainerEl>
    </GrantAccessEl>
  );
};
