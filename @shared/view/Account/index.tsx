import React, { useState } from "react";
import { Button, View, Text, Modal } from "react-native";

import FreighterLogo from "../assets/FreighterLogo";
import SignUpScreen from "../SignUpScreen";

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
}: AccountProps) => {
  const [showSignUp, setShowSignUp] = useState(false);

  return (
    <View data-testid="account-view-account-name">
      <View style={style} />
      <FreighterLogo />
      <Text style={{ color: textColor }}>{accountName}</Text>
      <Text style={{ color: textColor }}>Keychain: {keychainCount}</Text>
      <Text style={{ color: textColor }}>AsyncStorage: {asyncCount}</Text>
      <Button title="Increment" onPress={handleIncrement} />
      <Button title="Decrement" onPress={handleDecrement} />
      <Button title="Log Storage" onPress={logFromKeychain} />
      <Button title="Sign Up" onPress={() => setShowSignUp(true)} />

      <Modal
        visible={showSignUp}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSignUp(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              backgroundColor: "white",
              margin: 20,
              borderRadius: 10,
              padding: 20,
            }}
          >
            <SignUpScreen onClose={() => setShowSignUp(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Account;
