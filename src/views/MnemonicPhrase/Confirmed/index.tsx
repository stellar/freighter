import React from "react";

const MnemonicPhraseConfirmed = () => (
  <>
    <h1>Woo! You're in</h1>
    <p>
      Awesome, you passed the test. Keep your seedphrase safe, it’s your
      responsibility.
    </p>
    <p>Note: Lyra cannot recover your seedphrase.</p>
    <button
      onClick={() => {
        window.close();
      }}
    >
      Close
    </button>
  </>
);

export default MnemonicPhraseConfirmed;
