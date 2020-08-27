import React, { useState } from "react";
import { useDispatch } from "react-redux";
import styled from "styled-components";
import { useLocation } from "react-router-dom";
import punycode from "punycode";

import { parsedSearchParam } from "helpers/urls";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";
import { rejectAccess, grantAccess } from "popup/ducks/access";
import { Button } from "popup/basics/Buttons";
import { SubmitButton } from "popup/basics/Forms";

import "popup/metrics/access";

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
const ButtonContainerEl = styled.div`
  display: flex;
  justify-content: space-around;
  padding: 3rem 1.25rem;
`;
const RejectButtonEl = styled(Button)`
  background: ${COLOR_PALETTE.text};
`;

export const GrantAccess = () => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { url } = parsedSearchParam(location.search);
  const u = new URL(url);
  const punycodedDomain = punycode.toASCII(u.hostname);
  const [isGranting, setIsGranting] = useState(false);

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
      <TextEl>
        This site is asking for access to the public key associated with this
        Lyra wallet. Only share your information with websites you trust.{" "}
      </TextEl>
      <ButtonContainerEl>
        <RejectButtonEl size="small" onClick={rejectAndClose}>
          Reject
        </RejectButtonEl>
        <SubmitButton
          isSubmitting={isGranting}
          size="small"
          onClick={() => grantAndClose()}
        >
          Confirm
        </SubmitButton>
      </ButtonContainerEl>
    </GrantAccessEl>
  );
};
