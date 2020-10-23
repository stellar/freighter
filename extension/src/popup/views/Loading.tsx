import React from "react";
import styled from "styled-components";
import { Header } from "popup/components/Header";
import { COLOR_PALETTE, Z_INDEXES } from "popup/constants/styles";

const LoadingWrapperEl = styled.div`
  height: 100%;
  overflow: hidden;
  position: absolute;
  width: 100%;
  z-index: ${Z_INDEXES.loader};
`;

const LoadingEl = styled.div`
  display: flex;
  height: 100vh;
  justify-content: center;
  align-items: center;
`;

const LoadingSpinnerEl = styled.div`
  display: inline-block;
  height: 5rem;
  width: 5rem;

  &:after {
    content: " ";
    display: block;
    width: 2rem;
    height: 2rem;
    margin: 0.5rem;
    border-radius: 50%;
    border: 0.5rem solid ${COLOR_PALETTE.primary};
    border-color: ${COLOR_PALETTE.primary} transparent ${COLOR_PALETTE.primary}
      transparent;
    animation: lds-dual-ring 1.2s linear infinite;
  }

  @keyframes lds-dual-ring {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

export const Loading = () => (
  <LoadingWrapperEl>
    <Header />
    <LoadingEl>
      <LoadingSpinnerEl />
    </LoadingEl>
  </LoadingWrapperEl>
);
