import { Platform } from "react-native";

const serviceLayerTest = Platform.select({
  web: () => require("./extension/service/backend").default,
  ios: () => require("./ios/service/backend").default,
})!();

export default serviceLayerTest;
