import styled from "styled-components";
import { BasicButton } from "popup/basics/Buttons";
import { COLOR_PALETTE } from "popup/styles";

const ActionButton = styled(BasicButton)`
  color: ${COLOR_PALETTE.secondaryText};
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 2;
  opacity: 0.6;
`;

export default ActionButton;
