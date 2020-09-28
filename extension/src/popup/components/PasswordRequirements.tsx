import React from "react";
import styled from "styled-components";

import { COLOR_PALETTE } from "popup/constants/styles";

const El = styled.div`
  padding: 1.25rem 0 2.5rem;
`;

const ListEl = styled.ul`
  color: ${COLOR_PALETTE.secondaryText};
  list-style-type: disc;
  list-style-position: inside;
  font-size: 0.9rem;
  padding: 0;
  margin: 0;
`;

export const PasswordRequirements = () => (
  <El>
    <ListEl>
      <li>Must be at least 10 characters long</li>
      <li>Must contain an uppercase and lowercase letter</li>
      <li>Must contain a number</li>
    </ListEl>
  </El>
);
