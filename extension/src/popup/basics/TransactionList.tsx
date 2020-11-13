import styled from "styled-components";

import { COLOR_PALETTE, FONT_WEIGHT } from "popup/constants/styles";

export const TransactionList = styled.ul`
  width: 100%;
  font-size: 0.95rem;
  letter-spacing: 0.1px;
  list-style-type: none;
  padding: 0;
  margin: 0;
  margin-top: 1rem;
  margin-bottom: 1.33em;

  li {
    display: flex;
    margin: 1.25rem 0;
    color: ${COLOR_PALETTE.secondaryText};

    div:first-child {
      padding-right: 0.75rem;
    }
  }

  strong {
    font-weight: ${FONT_WEIGHT.bold};
    color: ${COLOR_PALETTE.text};
  }
`;
