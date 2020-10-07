import React from "react";
import styled from "styled-components";

import {
  COLOR_PALETTE,
  FONT_WEIGHT,
  ROUNDED_CORNERS,
} from "popup/constants/styles";

import { getPunycodedDomain } from "helpers/urls";

const El = styled.div`
  display: flex;
  background: ${COLOR_PALETTE.white};
  border-radius: ${ROUNDED_CORNERS};
  padding: 1.25rem;
  margin: 1.25rem 0px;
`;
const FaviconEl = styled.div`
  padding-right: 1.125rem;
`;
const DomainEl = styled.div`
  display: flex;
`;
const PunycodedDomainEl = styled.div`
  color: ${COLOR_PALETTE.primary};
  font-size: 1.18rem;
  font-weight: ${FONT_WEIGHT.bold};
`;
const InvalidDomainEl = styled.div`
  display: flex;
  flex-direction: column;
`;
const DecodedDomainEl = styled.span`
  font-size: 0.875rem;
  font-weight: ${FONT_WEIGHT.normal};
`;

export const PunycodedDomain = ({ domain, ...props }: { domain: string }) => {
  const punycodedDomain = getPunycodedDomain(domain);
  const isDomainValid = punycodedDomain === domain;

  // @TODO faviocon
  const favicon = false;

  return (
    <El {...props}>
      {favicon ? <FaviconEl>hello</FaviconEl> : null}
      <DomainEl>
        {isDomainValid ? (
          <PunycodedDomainEl>{punycodedDomain}</PunycodedDomainEl>
        ) : (
          <InvalidDomainEl>
            <PunycodedDomainEl>xn-{punycodedDomain}</PunycodedDomainEl>
            <DecodedDomainEl>{domain}</DecodedDomainEl>
          </InvalidDomainEl>
        )}
      </DomainEl>
    </El>
  );
};
