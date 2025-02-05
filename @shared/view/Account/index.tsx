import React from "react";
import { Button, View, Text } from "react-native";

import FreighterLogo from "../assets/FreighterLogo";

const style = { backgroundColor: "green", height: 100, width: 100 };

interface AccountProps {
  accountName: string;
  keychainCount: number;
  asyncCount: number;
  handleIncrement: () => void;
  handleDecrement: () => void;
  textColor: string;
  logFromKeychain: () => void;
}

export const Account = ({
  accountName,
  keychainCount,
  asyncCount,
  handleIncrement,
  handleDecrement,
  textColor,
  logFromKeychain,
}: AccountProps) => (
  <View data-testid="account-view-account-name">
    <View style={style} />
    <FreighterLogo />
    <Text style={{ color: textColor }}>{accountName}</Text>
    <Text style={{ color: textColor }}>Keychain: {keychainCount}</Text>
    <Text style={{ color: textColor }}>AsyncStorage: {asyncCount}</Text>
    <Button title="Increment" onPress={handleIncrement} />
    <Button title="Decrement" onPress={handleDecrement} />
    <Button title="Log Storage" onPress={logFromKeychain} />
  </View>
);

export default Account;
