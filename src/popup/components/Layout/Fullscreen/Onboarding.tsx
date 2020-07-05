import React from "react";
import styled from "styled-components";
import { COLOR_PALETTE } from "popup/styles";
import { BackButton } from "popup/basics";
import { FullscreenStyle } from "./basics/FullscreenStyle";

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
  flex-flow: column wrap;
  justify-content: center;
  padding: 100px 170px;
  height: 40rem;
`;

export const HalfScreen = styled.section`
  padding: 0 1.6rem;
  width: 27rem;
`;

const EmojiSpan = styled.span`
  font-size: 3.625rem;
`;

export const Onboarding = ({
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
  children: React.ReactNode;
}) => (
  <>
    <FullscreenStyle />
    {goBack ? <BackButton onClick={goBack} /> : null}
    <Screen>
      <EmojiSpan role="img" aria-label={alt}>
        {emoji}
      </EmojiSpan>
      <HeaderEl>{header}</HeaderEl>
      {subheader ? <SubheaderEl>{subheader}</SubheaderEl> : null}
      {children}
    </Screen>
  </>
);
