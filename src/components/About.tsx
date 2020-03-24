import React from "react";
import styled, { keyframes } from "styled-components";
import logo from "assets/logo.svg";

const logoSpin = keyframes`
from {
  transform: rotate(0deg);
}
to {
  transform: rotate(360deg);
}

`;

const El = styled.div`
  text-align: center;
`;

const LogoEl = styled.img`
  height: 40vmin;
  pointer-events: none;

  @media (prefers-reduced-motion: no-preference) {
    animation: ${logoSpin} infinite 20s linear;
  }
`;

const HeaderEl = styled.header`
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
`;

export function About() {
  return (
    <El>
      <HeaderEl>
        <LogoEl src={logo} className="App-logo" alt="logo" />
        <p>This is the About page. COOL HUH?!?</p>
      </HeaderEl>
    </El>
  );
}
