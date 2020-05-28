import React from "react";
import styled from "styled-components";
import { COLOR_PALETTE } from "styles";
import { Button } from "styles/Basics";
import Header from "./Header";

const H1 = styled.h1`
  color: ${COLOR_PALETTE.primary};
  font-weight: 200;
  font-size: 2.5rem;
  line-height: 3.4rem;
  margin: 1rem 0;
  max-width: 21rem;
`;

const Screen = styled.div`
  align-content: center;
  align-items: center;
  display: flex;
  justify-content: center;
  padding: 100px 170px;
`;

const HalfScreen = styled.div`
  padding: 0 25px;
  width: 415px;

  :nth-child(1) {
    margin-top: -130px;
  }
`;

const BackButton = styled(Button)`
  margin: 16px 0 0 44px;
`;

const Fullscreen = ({
  back,
  header,
  icon: [src, alt],
  children,
}: {
  back?: () => void;
  header: string;
  icon: [string, string];
  children: JSX.Element;
}) => (
  <>
    <Header />
    {back ? <BackButton onClick={back}>&lt; Back</BackButton> : null}
    <Screen>
      <HalfScreen>
        <img src={src} alt={alt} />
        <H1>{header}</H1>
      </HalfScreen>
      <HalfScreen>{children}</HalfScreen>
    </Screen>
  </>
);

export default Fullscreen;
