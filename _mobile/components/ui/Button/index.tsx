import { Platform } from "react-native";

const Button = Platform.select({
  ios: () => require("./ios").default,
  // android: () => require('./Button.android').default,
  web: () => require("./web").default,
})!();
export default Button;
