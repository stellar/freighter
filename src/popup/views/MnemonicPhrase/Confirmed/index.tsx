import React from "react";
import styled from "styled-components";
import Header from "popup/components/Layout/Header";
import { COLOR_PALETTE } from "popup/styles";
import { FormButton } from "popup/components/form";

const HeaderEl = styled.h1`
  font-weight: 200;
  font-size: 2.6rem;
  line-height: 2.75rem;
  margin: 1rem 0;
`;

const Wrapper = styled.div`
  background: ${COLOR_PALETTE.primary};
  color: #fff;
  display: flex;
  flex-direction: column;
  height: 100%;
  text-align: center;
`;

const FinishButton = styled(FormButton)`
  background: #654cf7;
  margin: 2.5rem auto 0;
`;

const Celebration = styled.h1`
  font-size: 5rem;
`;

const MnemonicPhraseConfirmed = () => (
  <>
    <Header />

    <Wrapper>
      <HeaderEl>Woo, you’re in!</HeaderEl>
      <Celebration>
        <span role="img" aria-label="Celebration face">
          🥳
        </span>
      </Celebration>
      <p>
        Awesome, you passed the test. Keep your seedphrase safe, it’s your
        responsibility.
      </p>
      <p>
        <strong>Note: Lyra cannot recover your seedphrase.</strong>
      </p>
      <FinishButton
        onClick={() => {
          window.close();
        }}
      >
        All done
      </FinishButton>
    </Wrapper>
  </>
);

export default MnemonicPhraseConfirmed;
