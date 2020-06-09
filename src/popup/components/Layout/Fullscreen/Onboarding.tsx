import React from "react";
import styled from "styled-components";
import { COLOR_PALETTE } from "popup/styles";
import { Button } from "popup/styles/Basics";
import FullscreenStyle from "./basics/FullscreenStyle";

const HeaderEl = styled.h1`
  color: ${COLOR_PALETTE.primary};
  font-weight: 200;
  font-size: 2.5rem;
  line-height: 3.4rem;
  margin: 0;
  max-width: 21rem;
`;

const SubheaderEl = styled.h2`
  color: ${COLOR_PALETTE.secondaryText};
  font-weight: 400;
  font-size: 0.9rem;
  max-width: 21rem;
`;

export const Screen = styled.section`
  align-content: center;
  display: flex;
  justify-content: center;
  padding: 100px 170px;
`;

const HalfScreen = styled.section`
  padding: 0 1.6rem;
  width: 19rem;

  :nth-child(1) {
    margin-top: 4.125rem;
  }
`;

const EmojiSpan = styled.span`
  font-size: 3.625rem;
`;

const BackButton = styled(Button)`
  margin: 1rem 0 0 2.75rem;
`;

const Onboarding = ({
  goBack,
  header,
  subheader,
  icon: { emoji, alt },
  children,
}: {
  goBack?: () => void;
  header: string;
  subheader?: string;
  icon: { emoji: string; alt: string };
  children: JSX.Element;
}) => (
  <>
    <FullscreenStyle />
    {goBack ? <BackButton onClick={goBack}>&lt; Back</BackButton> : null}
    <Screen>
      <HalfScreen>
        <EmojiSpan role="img" aria-label={alt}>
          {emoji}
        </EmojiSpan>
        <HeaderEl>{header}</HeaderEl>
        {subheader ? <SubheaderEl>{subheader}</SubheaderEl> : null}
      </HalfScreen>
      <HalfScreen>{children}</HalfScreen>
    </Screen>
  </>
);

export default Onboarding;
