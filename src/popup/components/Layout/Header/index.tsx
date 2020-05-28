import React from "react";
import styled from "styled-components";
import { COLOR_PALETTE } from "popup/styles";

const HeaderEl = styled.header`
  background: ${COLOR_PALETTE.primaryGradient};
  box-sizing: border-box;
  font-family: "Muli";
  display: flex;
  height: 6.2rem;
  justify-content: space-between;
  padding: 26px 54px;
  text-align: left;
`;

const HeaderH1 = styled.h1`
  color: #fff;
  font-size: 2rem;
  font-weight: 200;
  line-height: 41px;
  margin: 0;
`;

const NetworkEl = styled.h3`
  opacity: 0.5;
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
  line-height: 21px;
`;

const Header = () => (
  <HeaderEl>
    <HeaderH1>Lyra</HeaderH1>
    <NetworkEl>Test net</NetworkEl>
  </HeaderEl>
);

export default Header;
