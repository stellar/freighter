import React from "react";
import { Text, View, Platform, FlexAlignType } from "react-native";

import serviceLayerTest from "@/platform/service";
import Button from "@/components/ui/Button";

import "./root-styles.css";

const styles = {
  container: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as FlexAlignType,
  },
  webContainer: {
    // Web-specific styles
    width: 300,
    height: 400,
  },
};

export default function RootLayout() {
  React.useEffect(() => {
    console.log("runing effect");
    console.log(serviceLayerTest);
    serviceLayerTest();
    console.log("effect done");
  }, []);

  return (
    <View
      style={[styles.container, Platform.OS === "web" && styles.webContainer]}
    >
      <Text>Freighter</Text>
      <Button />
    </View>
  );
}
