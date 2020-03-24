import React from "react";
import { useDispatch } from "react-redux";
import styled, { keyframes } from "styled-components";

import logo from "assets/logo.svg";

import { ActionCreators } from "ducks/counter";
import { useRedux } from "hooks/useRedux";

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

const LinkEl = styled.a`
  color: #61dafb;
`;

export function Home() {
  const dispatch = useDispatch();
  const { counter } = useRedux<{ counter: number }>("counter");
  return (
    <El>
      <HeaderEl>
        <LogoEl src={logo} className="App-logo" alt="logo" />
        <p>
          The counter is now {counter}.{" "}
          <button onClick={() => dispatch(ActionCreators.increment())}>
            Increment
          </button>
        </p>
        <LinkEl
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </LinkEl>
      </HeaderEl>
    </El>
  );
}
