import React from "react";
import styled from "styled-components";

const El = styled.div`
  padding: 1.25rem 0 2.5rem;
`;

const ListEl = styled.ul`
  color: var(--pal-text-primary);
  list-style-type: disc;
  list-style-position: inside;
  font-size: 1rem;
  padding: 0;
  margin: 0;

  // TODO reconcile with SDS
  li::before {
    content: none;
  }
`;

export const PasswordRequirements = () => (
  <El>
    <ListEl>
      <li>Min 8 characters</li>
      <li>At least one uppercase letter</li>
    </ListEl>
  </El>
);
