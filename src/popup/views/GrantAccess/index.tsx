import React from "react";
import styled from "styled-components";
import { useLocation } from "react-router-dom";

import { rejectAccess, grantAccess } from "api/internal";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/styles";
import { Button } from "popup/basics";

const GrantAccessEl = styled.div`
  padding: 2.25rem 2.5rem;
`;
const H1 = styled.h1`
  color: ${COLOR_PALETTE.primary}};
  font-weight: ${FONT_WEIGHT.light};
  margin: 1rem 0 0.75rem;
`;
const H3 = styled.h3`
  font-weight: ${FONT_WEIGHT.bold};
  font-size: 0.95rem;
  letter-spacing: 0.1px;
  color: ${COLOR_PALETTE.primary}};
`;
const Text = styled.p`
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
const RejectButton = styled(Button)`
  background: ${COLOR_PALETTE.text};
`;

export const GrantAccess = () => {
  const location = useLocation();
  const decodedTab = atob(location.search.replace("?", ""));
  const tabToUnlock = decodedTab ? JSON.parse(decodedTab) : {};
  const { url, title } = tabToUnlock;

  const rejectAndClose = async () => {
    await rejectAccess();
    window.close();
  };

  const grantAndClose = async () => {
    await grantAccess(url);
    window.close();
  };

  return (
    <GrantAccessEl>
      <H1>Connection request</H1>
      <H3>{title} wants to know your public key</H3>
      <Text>
        This site is asking for access to the public key associated with this
        Lyra wallet. Only share your information with websites you trust.{" "}
      </Text>
      <ButtonContainerEl>
        <RejectButton size="small" onClick={() => rejectAndClose()}>
          Reject
        </RejectButton>
        <Button size="small" onClick={() => grantAndClose()}>
          Connect
        </Button>
      </ButtonContainerEl>
    </GrantAccessEl>
  );
};
