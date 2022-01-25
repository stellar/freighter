import React from "react";
import styled from "styled-components";

import { HEADER_HEIGHT } from "constants/dimensions";
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";

import { Header } from "popup/components/Header";
import { FullscreenStyle } from "popup/components/FullscreenStyle";

import { Card } from "popup/basics/Card";
import { Button } from "@stellar/design-system";

import "./styles.scss";

const LargeHeadingEl = styled.div`
  color: var(--pal-text-primary);
  font-size: 2.5rem;
  font-weight: 400;
  line-height: 3rem;
  margin-bottom: 2.5rem;
  text-align: center;
`;

const HeadingEl = styled.h3`
  font-size: 1.125rem;
  font-weight: 500;
  line-height: 3rem;
`;

const TextEl = styled.div`
  color: var(--pal-text-primary);
  opacity: 0.8;
  font-size: 1rem;
  line-height: 1.5rem;
  font-weight: 400;
`;

const ColumnScreenEl = styled.section`
  display: flex;
  flex-direction: column;
  align-content: center;
  justify-content: center;
  max-width: 49rem;
  height: calc(100vh - ${HEADER_HEIGHT}px);
  width: 100%;
  margin: auto;
`;

const CenteredRowScreenEl = styled.div`
  display: flex;
  justify-content: space-between;
  flex-direction: column;
`;

const RowScreenEl = styled.div`
  display: flex;
  justify-content: space-between;
`;

const HalfScreenEl = styled.section`
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0;
  width: 24rem;
  height: 12.25rem;
`;

export const Welcome = () => (
  <>
    <FullscreenStyle />
    <Header />
    <ColumnScreenEl>
      <CenteredRowScreenEl>
        <LargeHeadingEl>
          Welcome! Is this your first <br />
          time using Freighter?
        </LargeHeadingEl>
      </CenteredRowScreenEl>
      <RowScreenEl>
        <HalfScreenEl>
          <Card variant={Card.variant.highlight}>
            <HeadingEl>I’m new!</HeadingEl>
            <TextEl>I’m going to need a seed phrase</TextEl>
            <div className="Welcome--button-container">
              <Button onClick={() => navigateTo(ROUTES.accountCreator)}>
                Create wallet
              </Button>
            </div>
          </Card>
        </HalfScreenEl>
        <HalfScreenEl>
          <Card>
            <HeadingEl>I’ve done this before</HeadingEl>
            <TextEl>I have my 12 word seed phrase</TextEl>
            <div className="Welcome--button-container">
              <Button
                variant={Button.variant.tertiary}
                onClick={() => navigateTo(ROUTES.recoverAccount)}
              >
                Import wallet
              </Button>
            </div>
          </Card>
        </HalfScreenEl>
      </RowScreenEl>
    </ColumnScreenEl>
  </>
);
