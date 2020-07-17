import React from "react";
import styled from "styled-components";

import { HEADER_HEIGHT } from "popup/constants/dimensions";
import { COLOR_PALETTE } from "popup/constants/styles";

import { BackButton } from "popup/basics/Buttons";
import { FullscreenStyle } from "./FullscreenStyle";

interface HeaderProps {
  isMaxHeaderLength?: boolean;
}

const HeaderEl = styled.h1<HeaderProps>`
  color: ${COLOR_PALETTE.primary};
  font-weight: 200;
  font-size: 2.5rem;
  line-height: 1.3;
  margin: 0.625rem 0;
  max-width: ${(props) => (props.isMaxHeaderLength ? "22.35rem" : "21rem")};
`;

const SubheaderEl = styled.h2`
  color: ${COLOR_PALETTE.secondaryText};
  font-weight: 400;
  font-size: 0.9rem;
  max-width: 23rem;
`;

export const Screen = styled.section`
  display: flex;
  flex-flow: column wrap;
  align-content: center;
  justify-content: center;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  max-height: 40rem;
  max-width: 57rem;
  width: 100%;
  margin: auto;

  & > * {
    display: flex;
    flex-direction: column;
    flex: 0 1 21.25rem;
    justify-content: center;
  }

  /* Fix this in /basics once using the formik hook */
  textarea {
    margin-top: 2rem;
    min-height: 10rem;
  }
`;

export const HalfScreen = styled.section`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0;
  padding-top: 3.25rem;
  padding-right: 0;
  padding-bottom: 2rem;
  padding-left: 4.55rem;
  width: 27rem;
`;

const EmojiSpan = styled.span`
  font-size: 3.625rem;
`;

const HeadingEl = styled.div``;

export const Onboarding = ({
  goBack,
  header,
  subheader,
  icon: { emoji, alt },
  children,
  isMaxHeaderLength,
}: {
  goBack?: () => void;
  header: string;
  subheader?: string;
  isMaxHeaderLength?: boolean;
  icon: { emoji: string; alt: string };
  children: React.ReactNode;
}) => (
  <>
    <FullscreenStyle />
    {goBack ? <BackButton onClick={goBack} /> : null}
    <Screen>
      <HeadingEl>
        <EmojiSpan role="img" aria-label={alt}>
          {emoji}
        </EmojiSpan>
        <HeaderEl isMaxHeaderLength={isMaxHeaderLength}>{header}</HeaderEl>
        {subheader ? <SubheaderEl>{subheader}</SubheaderEl> : null}
      </HeadingEl>
      {children}
    </Screen>
  </>
);
