import React from "react";
import { Button, View, Text } from "react-native";

import FreighterLogo from "../assets/FreighterLogo";

const style = { backgroundColor: "green", height: 100, width: 100 };

interface AccountProps {
  accountName: string;
  count: number;
  handleIncrement: () => void;
  handleDecrement: () => void;
  textColor: string;
  logFromKeychain: () => void;
}

export const Account = ({
  accountName,
  count,
  handleIncrement,
  handleDecrement,
  textColor,
  logFromKeychain,
}: AccountProps) => (
  <View data-testid="account-view-account-name">
    <View style={style} />
    <FreighterLogo />
    <Text style={{ color: textColor }}>
      {accountName} {count}
    </Text>
    <Button title="Increment" onPress={handleIncrement} />
    <Button title="Decrement" onPress={handleDecrement} />
    <Button title="Log Keychain" onPress={logFromKeychain} />
  </View>
);

export default Account;
