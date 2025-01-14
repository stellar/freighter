import React from "react";
import { Button, Alert } from "react-native";

export default function IOSButton() {
  return (
    <Button
      title="Click Me (iOS)"
      onPress={() => Alert.alert("iOS Button Pressed")}
    />
  );
}
