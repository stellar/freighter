/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import React from 'react';
import type {PropsWithChildren} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  Colors,
  DebugInstructions,
  Header,
  LearnMoreLinks,
  ReloadInstructions,
} from 'react-native/Libraries/NewAppScreen';
import {NETWORK_NAMES} from '../../helpers/network';
import {truncatedPublicKey} from '../../helpers/stellar';

interface AccountBalanceProps {
  network: NETWORK_NAMES;
  account: {
    name: string;
    publicKey: string;
  };
  assets: {
    name: string;
    balance: string;
  }[];
}

export const AccountBalance = () => {
  const props = {
    network: NETWORK_NAMES.TESTNET,
    account: {
      name: 'Account 1',
      publicKey: 'GCBDC5AVPZEOSO3IAASQZSVRJMHX3UCCZH5O7S53FPZ636LQ5RHEW65H',
    },
    assets: [
      {name: 'XLM', balance: '382.129837'},
      {name: 'yUSDC', balance: '5'},
    ],
  };
  return (
    <View style={styles.accountBalance}>
      <View style={styles.accountRow}>
        <View>
          <Text style={styles.accountName}>{props.account.name}</Text>
          <Text style={styles.accountPublicKey}>
            {truncatedPublicKey(props.account.publicKey)}
          </Text>
        </View>
        <View style={styles.networkId}>
          <Text style={styles.networkName}>{props.network}</Text>
        </View>
      </View>
      <View style={styles.assets}>
        {props.assets.map(asset => (
          <View style={styles.assetRow} key={asset.name + asset.balance}>
            <Text style={styles.assetDetail}>{asset.name}</Text>
            <Text style={styles.assetDetail}>
              {asset.balance} {asset.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  accountBalance: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: 'black',
    padding: 10,
  },
  accountRow: {
    height: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  accountName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  accountPublicKey: {
    fontSize: 14,
    color: 'grey',
  },
  networkId: {
    borderWidth: 1,
    borderRadius: 2,
    borderColor: 'grey',
    justifyContent: 'center',
    alignContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  networkName: {
    color: 'white',
  },
  assets: {
    flexGrow: 1,
    marginTop: 48,
  },
  assetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  assetDetail: {
    fontSize: 18,
    color: 'white',
    marginBottom: 12,
  },
});
