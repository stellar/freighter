import styled, { css } from "styled-components";

const inputStyle = css`
  background: "#fff";
  color: "#000";
  display: block;
  margin: 1em 0;
  width: 50%;
`;

export const PlaygroundInput = styled.input`
  ${inputStyle}
`;

export const PlaygroundTextarea = styled.textarea`
  ${inputStyle}
  height: 10em;
`;
