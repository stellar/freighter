import styled from "styled-components";

import { SubmitButton as BasicSubmitButton } from "./Forms";

export const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-around;
  padding-top: 3rem;
  padding-bottom: 1.5rem;
`;

export const SubmitButton = styled(BasicSubmitButton)`
  width: 12.43rem;
`;
