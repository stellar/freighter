import React from "react";
import { ThemedText } from "@/components/ThemedText";

import { Button, Alert } from "react-native";

export default function IOSButton() {
  return (
    <>
      <ThemedText>bye</ThemedText>
      <Button
        title="Click Me (iOS)"
        onPress={() => Alert.alert("iOS Button Pressed")}
      />
    </>
  );
}
