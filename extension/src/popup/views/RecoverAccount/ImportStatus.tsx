import React from "react";
import { Text } from "@stellar/design-system";

import { View } from "popup/basics/layout/View";
import LogoVarial from "popup/assets/logo-varial.svg?react";

// Full-screen brand mark with one line of text: the "importing" and
// "ready" states of the onboarding import.
export const ImportStatus = ({ text }: { text: string }) => (
  <View.Content alignment="center" hasNoTopPadding hasNoBottomPadding>
    <div className="RecoverAccount__status" data-testid="import-status">
      <LogoVarial className="RecoverAccount__status__logo" aria-hidden="true" />
      <Text as="p" size="lg" weight="medium" role="status">
        {text}
      </Text>
    </div>
  </View.Content>
);
