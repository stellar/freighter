import React from "react";
import styled from "styled-components";
import { COLOR_PALETTE } from "popup/styles";
import { Button } from "popup/styles/Basics";

const HeaderEl = styled.h1`
  color: ${COLOR_PALETTE.primary};
  font-weight: 200;
  font-size: 2.5rem;
  line-height: 3.4rem;
  margin: 1rem 0;
  max-width: 21rem;
`;

export const Screen = styled.section`
  align-content: center;
  align-items: center;
  display: flex;
  justify-content: center;
  padding: 100px 170px;
`;

const HalfScreen = styled.section`
  padding: 0 1.6rem;
  width: 30rem;

  :nth-child(1) {
    margin-top: -8.125rem;
  }
`;

const BackButton = styled(Button)`
  margin: 1rem 0 0 2.75rem;
`;

const Fullscreen = ({
  goBack,
  header,
  icon: { src, alt },
  children,
}: {
  goBack?: () => void;
  header: string;
  icon: { src: string; alt: string };
  children: JSX.Element;
}) => (
  <>
    {goBack ? <BackButton onClick={goBack}>&lt; Back</BackButton> : null}
    <Screen>
      <HalfScreen>
        <img src={src} alt={alt} />
        <HeaderEl>{header}</HeaderEl>
      </HalfScreen>
      <HalfScreen>{children}</HalfScreen>
    </Screen>
  </>
);

export default Fullscreen;
