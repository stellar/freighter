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
    align-items: center;
    display: flex;
    min-height: 2.1875rem;
    color: ${COLOR_PALETTE.secondaryText};

    > div {
      margin-right: 0.75rem;
    }
  }

  strong {
    font-weight: ${FONT_WEIGHT.bold};
    color: ${COLOR_PALETTE.text};
  }
`;
