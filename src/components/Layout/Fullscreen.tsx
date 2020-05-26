import React from "react";
import styled from "styled-components";
import Header from "./Header";

const H1 = styled.h1`
  font-weight: 200;
  font-size: 2.5rem;
  line-height: 3.4rem;
  margin: 1rem 0;
`;

const Screen = styled.div`
  align-content: center;
  align-items: center;
  display: flex;
  justify-content: center;
  padding: 100px 170px;
`;

const HalfScreen = styled.div`
  padding: 0 30px;
  width: 355px;

  :nth-child(1) {
    margin-top: -20px;
  }
`;

const Fullscreen = ({
  header,
  icon: [src, alt],
  children,
}: {
  header: string;
  icon: [string, string];
  children: JSX.Element;
}) => {
  return (
    <>
      <Header />
      <Screen>
        <HalfScreen>
          <img src={src} alt={alt} />
          <H1>{header}</H1>
        </HalfScreen>
        <HalfScreen>{children}</HalfScreen>
      </Screen>
    </>
  );
};

export default Fullscreen;
