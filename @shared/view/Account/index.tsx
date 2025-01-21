import React from "react";
import { View, Text } from "react-native";

import "../global.css";

const currentAccountName = "Account Name!!";

export const Account = () => (
  <View data-testid="account-view-account-name">
    <View className="w-10 h-10 bg-blue-500" />
    <Text className="text-red-500">{currentAccountName}</Text>
    <View className="w-10 h-10 bg-blue-500" />

    <Text>btm111</Text>
  </View>
);

export default Account;
