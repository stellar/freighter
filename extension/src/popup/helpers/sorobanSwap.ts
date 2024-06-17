/* eslint-disable */

import {
  Keypair,
  Account,
  Address,
  Contract,
  TransactionBuilder,
  BASE_FEE,
  SorobanRpc,
  Transaction,
  nativeToScVal,
  xdr,
} from "stellar-sdk";
import {
  Router,
  Token,
  CurrencyAmount,
  TradeType,
  Networks,
  Protocols,
} from "soroswap-router-sdk";
import axios from "axios";

import {
  TESTNET_NETWORK_DETAILS,
  NetworkDetails,
} from "@shared/constants/stellar";
import { getSdk } from "@shared/helpers/stellar";
import { stellarSdkServer } from "@shared/api/helpers/stellarSdkServer";
import { buildSorobanServer } from "@shared/helpers/soroban/server";
import { isTestnet } from "helpers/stellar";

const stubbedData = [
  {
    tokenA: {
      name: "ArgentinePeso",
      contract: "CBWTXFD3AVFTLTZ75HAYMASJUPHFOK4IO5ARNYNKAZOQHAVDAVGA6OFQ",
      code: "ARST",
      icon: "https://static.ultrastellar.com/media/assets/img/648754b5-f91d-46c4-97f9-557642976a75.png",
      decimals: 7,
    },
    tokenB: {
      name: "Dogstar",
      contract: "CDPU5TPNUMZ5JY3AUSENSINOEB324WI65AHI7PJBUKR3DJP2ULCBWQCS",
      code: "XTAR",
      icon: "https://www.dogstarcoin.com/assets/img/dogstarcoin-logo.png",
      decimals: 7,
    },
    address: "CAAK4UR5AJR3SQZEJYWSAQ7DSC6EHRA56ETMUBMMFQWLIV34BAZYXQNR",
    reserveA: "0",
    reserveB: "0",
    tokenAPrice: 0,
    tokenBPrice: 0.6221275,
    fees24h: 0,
    feesYearly: 0,
    liquidity: 0,
    tvl: 0,
    volume24h: 0,
    volume7d: 0,
    tvlChartData: [],
    volumeChartData: [{ date: "2024-06-12", volume: 0 }],
  },
  {
    tokenA: {
      name: "ArgentinePeso",
      contract: "CBWTXFD3AVFTLTZ75HAYMASJUPHFOK4IO5ARNYNKAZOQHAVDAVGA6OFQ",
      code: "ARST",
      icon: "https://static.ultrastellar.com/media/assets/img/648754b5-f91d-46c4-97f9-557642976a75.png",
      decimals: 7,
    },
    tokenB: {
      name: "USDCoin",
      contract: "CCGCRYUTDRP52NOPS35FL7XIOZKKGQWSP3IYFE6B66KD4YOGJMWVC5PR",
      code: "USDC",
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
      decimals: 7,
    },
    address: "CD4UJC2TC6IVA6PHW6PBBD6PQS67J4B2U5XXHWKKSPTTTXP522CFFKMB",
    reserveA: "0",
    reserveB: "0",
    tokenAPrice: 0,
    tokenBPrice: 0,
    fees24h: 0,
    feesYearly: 0,
    liquidity: 0,
    tvl: 0,
    volume24h: 0,
    volume7d: 0,
    tvlChartData: [],
    volumeChartData: [{ date: "2024-06-12", volume: 0 }],
  },
  {
    tokenA: {
      name: "Dogstar",
      contract: "CDPU5TPNUMZ5JY3AUSENSINOEB324WI65AHI7PJBUKR3DJP2ULCBWQCS",
      code: "XTAR",
      icon: "https://www.dogstarcoin.com/assets/img/dogstarcoin-logo.png",
      decimals: 7,
    },
    tokenB: {
      name: "Aquarius",
      contract: "CDTAZLQXF5X7FMVYNQJRR7JE2FYGJ6W7AIKPAMRS6GEUDGDR6C4MN4PR",
      code: "AQUA",
      icon: "https://static.ultrastellar.com/media/assets/img/1878ee2d-2fd1-4e31-89a7-5a430f1596f8.png",
      decimals: 7,
    },
    address: "CCTHHN742DO7T4IGKZYDXQY7BUVBWDE2YEVTZ4TUNQ2RPLMJJXMYUFVS",
    reserveA: "0",
    reserveB: "0",
    tokenAPrice: 0.6221275,
    tokenBPrice: 0,
    fees24h: 0,
    feesYearly: 0,
    liquidity: 0,
    tvl: 0,
    volume24h: 0,
    volume7d: 0,
    tvlChartData: [],
    volumeChartData: [{ date: "2024-06-12", volume: 0 }],
  },
  {
    tokenA: {
      name: "EURoCoin",
      contract: "CCCGHTCQHY5CGUIBNLDDF6KNAUSCQDV235MUKP42G5SNHZHZUMJDWZ3Z",
      code: "EURC",
      icon: "https://static.ultrastellar.com/media/assets/img/f8b00dbf-64b3-488f-bcd2-354f29e2cdc8.png",
      decimals: 7,
    },
    tokenB: {
      name: "Aquarius",
      contract: "CDTAZLQXF5X7FMVYNQJRR7JE2FYGJ6W7AIKPAMRS6GEUDGDR6C4MN4PR",
      code: "AQUA",
      icon: "https://static.ultrastellar.com/media/assets/img/1878ee2d-2fd1-4e31-89a7-5a430f1596f8.png",
      decimals: 7,
    },
    address: "CDAUJFQTBS56VCMFW6W5EQFV5PRJ2OCXYAONWLH54XTLGZLXJ4253BYI",
    reserveA: "0",
    reserveB: "0",
    tokenAPrice: 0,
    tokenBPrice: 0,
    fees24h: 0,
    feesYearly: 0,
    liquidity: 0,
    tvl: 0,
    volume24h: 0,
    volume7d: 0,
    tvlChartData: [],
    volumeChartData: [{ date: "2024-06-12", volume: 0 }],
  },
  {
    tokenA: {
      name: "EURoCoin",
      contract: "CCCGHTCQHY5CGUIBNLDDF6KNAUSCQDV235MUKP42G5SNHZHZUMJDWZ3Z",
      code: "EURC",
      icon: "https://static.ultrastellar.com/media/assets/img/f8b00dbf-64b3-488f-bcd2-354f29e2cdc8.png",
      decimals: 7,
    },
    tokenB: {
      name: "USDCoin",
      contract: "CCGCRYUTDRP52NOPS35FL7XIOZKKGQWSP3IYFE6B66KD4YOGJMWVC5PR",
      code: "USDC",
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
      decimals: 7,
    },
    address: "CBG4NWZJGHYUZFXWEEL24FL4KMIVYA5T4I4GSNV52X3VVMOQRCO77JW6",
    reserveA: "0",
    reserveB: "0",
    tokenAPrice: 0,
    tokenBPrice: 0,
    fees24h: 0,
    feesYearly: 0,
    liquidity: 0,
    tvl: 0,
    volume24h: 0,
    volume7d: 0,
    tvlChartData: [],
    volumeChartData: [{ date: "2024-06-12", volume: 0 }],
  },
  {
    tokenA: {
      name: "Stellar Lumens",
      contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      code: "XLM",
      icon: "https://assets.coingecko.com/coins/images/100/standard/Stellar_symbol_black_RGB.png",
      decimals: 7,
    },
    tokenB: {
      name: "Dogstar",
      contract: "CDPU5TPNUMZ5JY3AUSENSINOEB324WI65AHI7PJBUKR3DJP2ULCBWQCS",
      code: "XTAR",
      icon: "https://www.dogstarcoin.com/assets/img/dogstarcoin-logo.png",
      decimals: 7,
    },
    address: "CAXRHGQGPZFX7M4UIDMTK4ZZ6IKOD27Y5QEEJWQP4JFWVUCIASKCOG2R",
    reserveA: "0",
    reserveB: "0",
    tokenAPrice: 0,
    tokenBPrice: 0.6221275,
    fees24h: 0,
    feesYearly: 0,
    liquidity: 0,
    tvl: 0,
    volume24h: 0,
    volume7d: 0,
    tvlChartData: [],
    volumeChartData: [{ date: "2024-06-12", volume: 0 }],
  },
  {
    tokenA: {
      name: "USDCoin",
      contract: "CCGCRYUTDRP52NOPS35FL7XIOZKKGQWSP3IYFE6B66KD4YOGJMWVC5PR",
      code: "USDC",
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
      decimals: 7,
    },
    tokenB: {
      name: "Stellar Lumens",
      contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      code: "XLM",
      icon: "https://assets.coingecko.com/coins/images/100/standard/Stellar_symbol_black_RGB.png",
      decimals: 7,
    },
    address: "CDKQGJFRTFFGSLNDZXTRZHJLTMP7DJVLIIW5TEER5JBLFPISHKLQQNNH",
    reserveA: "0",
    reserveB: "0",
    tokenAPrice: 0,
    tokenBPrice: 0,
    fees24h: 0,
    feesYearly: 0,
    liquidity: 0,
    tvl: 0,
    volume24h: 0,
    volume7d: 0,
    tvlChartData: [],
    volumeChartData: [{ date: "2024-06-12", volume: 0 }],
  },
  {
    tokenA: {
      name: "USDCoin",
      contract: "CCGCRYUTDRP52NOPS35FL7XIOZKKGQWSP3IYFE6B66KD4YOGJMWVC5PR",
      code: "USDC",
      icon: "https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png",
      decimals: 7,
    },
    tokenB: {
      name: "Dogstar",
      contract: "CDPU5TPNUMZ5JY3AUSENSINOEB324WI65AHI7PJBUKR3DJP2ULCBWQCS",
      code: "XTAR",
      icon: "https://www.dogstarcoin.com/assets/img/dogstarcoin-logo.png",
      decimals: 7,
    },
    address: "CDLVBCCJPALOGLQKNTDZORZKTNLZPTXNTEBGBMMOBRFV5OTONTK3LIO5",
    reserveA: "1249003795135",
    reserveB: "2001600000000",
    tokenAPrice: 0,
    tokenBPrice: 0.6221275,
    fees24h: 0,
    feesYearly: 0,
    liquidity: 0,
    tvl: 124525.04040000001,
    volume24h: 124425.50000000001,
    volume7d: 124425.50000000001,
    tvlChartData: [
      { date: "2024-02-07", tvl: 0 },
      { date: "2024-02-08", tvl: 0 },
      { date: "2024-02-09", tvl: 0 },
      { date: "2024-02-10", tvl: 0 },
      { date: "2024-02-11", tvl: 0 },
      { date: "2024-02-12", tvl: 0 },
      { date: "2024-02-13", tvl: 0 },
      { date: "2024-02-14", tvl: 0 },
      { date: "2024-02-15", tvl: 0 },
      { date: "2024-02-16", tvl: 0 },
      { date: "2024-02-17", tvl: 0 },
      { date: "2024-02-18", tvl: 0 },
      { date: "2024-02-19", tvl: 0 },
      { date: "2024-02-20", tvl: 0 },
      { date: "2024-02-21", tvl: 0 },
      { date: "2024-02-22", tvl: 0 },
      { date: "2024-02-23", tvl: 0 },
      { date: "2024-02-24", tvl: 0 },
      { date: "2024-02-25", tvl: 0 },
      { date: "2024-02-26", tvl: 0 },
      { date: "2024-02-27", tvl: 0 },
      { date: "2024-02-28", tvl: 0 },
      { date: "2024-02-29", tvl: 0 },
      { date: "2024-03-01", tvl: 0 },
      { date: "2024-03-02", tvl: 0 },
      { date: "2024-03-03", tvl: 0 },
      { date: "2024-03-04", tvl: 0 },
      { date: "2024-03-05", tvl: 0 },
      { date: "2024-03-06", tvl: 0 },
      { date: "2024-03-07", tvl: 0 },
      { date: "2024-03-08", tvl: 0 },
      { date: "2024-03-09", tvl: 0 },
      { date: "2024-03-10", tvl: 0 },
      { date: "2024-03-11", tvl: 0 },
      { date: "2024-03-12", tvl: 0 },
      { date: "2024-03-13", tvl: 0 },
      { date: "2024-03-14", tvl: 0 },
      { date: "2024-03-15", tvl: 0 },
      { date: "2024-03-16", tvl: 0 },
      { date: "2024-03-17", tvl: 0 },
      { date: "2024-03-18", tvl: 0 },
      { date: "2024-03-19", tvl: 0 },
      { date: "2024-03-20", tvl: 0 },
      { date: "2024-03-21", tvl: 0 },
      { date: "2024-03-22", tvl: 0 },
      { date: "2024-03-23", tvl: 0 },
      { date: "2024-03-24", tvl: 0 },
      { date: "2024-03-25", tvl: 0 },
      { date: "2024-03-26", tvl: 0 },
      { date: "2024-03-27", tvl: 0 },
      { date: "2024-03-28", tvl: 0 },
      { date: "2024-03-29", tvl: 0 },
      { date: "2024-03-30", tvl: 0 },
      { date: "2024-03-31", tvl: 0 },
      { date: "2024-04-01", tvl: 0 },
      { date: "2024-04-02", tvl: 0 },
      { date: "2024-04-03", tvl: 0 },
      { date: "2024-04-04", tvl: 0 },
      { date: "2024-04-05", tvl: 0 },
      { date: "2024-04-06", tvl: 0 },
      { date: "2024-04-07", tvl: 0 },
      { date: "2024-04-08", tvl: 0 },
      { date: "2024-04-09", tvl: 0 },
      { date: "2024-04-10", tvl: 0 },
      { date: "2024-04-11", tvl: 0 },
      { date: "2024-04-12", tvl: 0 },
      { date: "2024-04-13", tvl: 0 },
      { date: "2024-04-14", tvl: 0 },
      { date: "2024-04-15", tvl: 0 },
      { date: "2024-04-16", tvl: 0 },
      { date: "2024-04-17", tvl: 0 },
      { date: "2024-04-18", tvl: 0 },
      { date: "2024-04-19", tvl: 0 },
      { date: "2024-04-20", tvl: 0 },
      { date: "2024-04-21", tvl: 0 },
      { date: "2024-04-22", tvl: 0 },
      { date: "2024-04-23", tvl: 0 },
      { date: "2024-04-24", tvl: 0 },
      { date: "2024-04-25", tvl: 0 },
      { date: "2024-04-26", tvl: 0 },
      { date: "2024-04-27", tvl: 0 },
      { date: "2024-04-28", tvl: 0 },
      { date: "2024-04-29", tvl: 0 },
      { date: "2024-04-30", tvl: 0 },
      { date: "2024-05-01", tvl: 0 },
      { date: "2024-05-02", tvl: 0 },
      { date: "2024-05-03", tvl: 0 },
      { date: "2024-05-04", tvl: 0 },
      { date: "2024-05-05", tvl: 0 },
      { date: "2024-05-06", tvl: 0 },
      { date: "2024-05-07", tvl: 0 },
      { date: "2024-05-08", tvl: 0 },
      { date: "2024-05-09", tvl: 0 },
      { date: "2024-05-10", tvl: 0 },
      { date: "2024-05-11", tvl: 0 },
      { date: "2024-05-12", tvl: 0 },
      { date: "2024-05-13", tvl: 0 },
      { date: "2024-05-14", tvl: 0 },
      { date: "2024-05-15", tvl: 0 },
      { date: "2024-05-16", tvl: 0 },
      { date: "2024-05-17", tvl: 0 },
      { date: "2024-05-18", tvl: 0 },
      { date: "2024-05-19", tvl: 0 },
      { date: "2024-05-20", tvl: 0 },
      { date: "2024-05-21", tvl: 0 },
      { date: "2024-05-22", tvl: 0 },
      { date: "2024-05-23", tvl: 0 },
      { date: "2024-05-24", tvl: 0 },
      { date: "2024-05-25", tvl: 0 },
      { date: "2024-05-26", tvl: 0 },
      { date: "2024-05-27", tvl: 0 },
      { date: "2024-05-28", tvl: 0 },
      { date: "2024-05-29", tvl: 0 },
      { date: "2024-05-30", tvl: 0 },
      { date: "2024-05-31", tvl: 0 },
      { date: "2024-06-01", tvl: 0 },
      { date: "2024-06-02", tvl: 0 },
      { date: "2024-06-03", tvl: 0 },
      { date: "2024-06-04", tvl: 0 },
      { date: "2024-06-05", tvl: 0 },
      { date: "2024-06-06", tvl: 0 },
      { date: "2024-06-07", tvl: 0 },
      { date: "2024-06-08", tvl: 0 },
      { date: "2024-06-09", tvl: 0 },
      { date: "2024-06-10", tvl: 0 },
      { date: "2024-06-11", tvl: 0 },
      { date: "2024-06-12", tvl: 0 },
    ],
    volumeChartData: [
      {
        timestamp: "1707309730",
        date: "2024-02-07T12:42:10.000Z",
        volume: 37.327650000000006,
      },
      { date: "2024-02-08", volume: 37.327650000000006 },
      { date: "2024-02-09", volume: 37.327650000000006 },
      { date: "2024-02-10", volume: 37.327650000000006 },
      { date: "2024-02-11", volume: 37.327650000000006 },
      { date: "2024-02-12", volume: 37.327650000000006 },
      { date: "2024-02-13", volume: 37.327650000000006 },
      { date: "2024-02-14", volume: 37.327650000000006 },
      { date: "2024-02-15", volume: 37.327650000000006 },
      { date: "2024-02-16", volume: 37.327650000000006 },
      { date: "2024-02-17", volume: 37.327650000000006 },
      { date: "2024-02-18", volume: 37.327650000000006 },
      { date: "2024-02-19", volume: 37.327650000000006 },
      { date: "2024-02-20", volume: 37.327650000000006 },
      { date: "2024-02-21", volume: 37.327650000000006 },
      { date: "2024-02-22", volume: 37.327650000000006 },
      { date: "2024-02-23", volume: 37.327650000000006 },
      { date: "2024-02-24", volume: 37.327650000000006 },
      { date: "2024-02-25", volume: 37.327650000000006 },
      { date: "2024-02-26", volume: 37.327650000000006 },
      { date: "2024-02-27", volume: 37.327650000000006 },
      { date: "2024-02-28", volume: 37.327650000000006 },
      { date: "2024-02-29", volume: 37.327650000000006 },
      { date: "2024-03-01", volume: 37.327650000000006 },
      { date: "2024-03-02", volume: 37.327650000000006 },
      { date: "2024-03-03", volume: 37.327650000000006 },
      { date: "2024-03-04", volume: 37.327650000000006 },
      { date: "2024-03-05", volume: 37.327650000000006 },
      { date: "2024-03-06", volume: 37.327650000000006 },
      { date: "2024-03-07", volume: 37.327650000000006 },
      { date: "2024-03-08", volume: 37.327650000000006 },
      { date: "2024-03-09", volume: 37.327650000000006 },
      { date: "2024-03-10", volume: 37.327650000000006 },
      { date: "2024-03-11", volume: 37.327650000000006 },
      { date: "2024-03-12", volume: 37.327650000000006 },
      { date: "2024-03-13", volume: 37.327650000000006 },
      { date: "2024-03-14", volume: 37.327650000000006 },
      { date: "2024-03-15", volume: 37.327650000000006 },
      { date: "2024-03-16", volume: 37.327650000000006 },
      { date: "2024-03-17", volume: 37.327650000000006 },
      { date: "2024-03-18", volume: 37.327650000000006 },
      { date: "2024-03-19", volume: 37.327650000000006 },
      { date: "2024-03-20", volume: 37.327650000000006 },
      { date: "2024-03-21", volume: 37.327650000000006 },
      { date: "2024-03-22", volume: 37.327650000000006 },
      { date: "2024-03-23", volume: 37.327650000000006 },
      { date: "2024-03-24", volume: 37.327650000000006 },
      { date: "2024-03-25", volume: 37.327650000000006 },
      { date: "2024-03-26", volume: 37.327650000000006 },
      { date: "2024-03-27", volume: 37.327650000000006 },
      { date: "2024-03-28", volume: 37.327650000000006 },
      { date: "2024-03-29", volume: 37.327650000000006 },
      { date: "2024-03-30", volume: 37.327650000000006 },
      { date: "2024-03-31", volume: 37.327650000000006 },
      { date: "2024-04-01", volume: 37.327650000000006 },
      { date: "2024-04-02", volume: 37.327650000000006 },
      { date: "2024-04-03", volume: 37.327650000000006 },
      { date: "2024-04-04", volume: 37.327650000000006 },
      { date: "2024-04-05", volume: 37.327650000000006 },
      { date: "2024-04-06", volume: 37.327650000000006 },
      { date: "2024-04-07", volume: 37.327650000000006 },
      { date: "2024-04-08", volume: 37.327650000000006 },
      { date: "2024-04-09", volume: 37.327650000000006 },
      { date: "2024-04-10", volume: 37.327650000000006 },
      { date: "2024-04-11", volume: 37.327650000000006 },
      { date: "2024-04-12", volume: 37.327650000000006 },
      { date: "2024-04-13", volume: 37.327650000000006 },
      { date: "2024-04-14", volume: 37.327650000000006 },
      { date: "2024-04-15", volume: 37.327650000000006 },
      { date: "2024-04-16", volume: 37.327650000000006 },
      { date: "2024-04-17", volume: 37.327650000000006 },
      { date: "2024-04-18", volume: 37.327650000000006 },
      { date: "2024-04-19", volume: 37.327650000000006 },
      { date: "2024-04-20", volume: 37.327650000000006 },
      { date: "2024-04-21", volume: 37.327650000000006 },
      { date: "2024-04-22", volume: 37.327650000000006 },
      { date: "2024-04-23", volume: 37.327650000000006 },
      { date: "2024-04-24", volume: 37.327650000000006 },
      { date: "2024-04-25", volume: 37.327650000000006 },
      { date: "2024-04-26", volume: 37.327650000000006 },
      { date: "2024-04-27", volume: 37.327650000000006 },
      { date: "2024-04-28", volume: 37.327650000000006 },
      { date: "2024-04-29", volume: 37.327650000000006 },
      { date: "2024-04-30", volume: 37.327650000000006 },
      { date: "2024-05-01", volume: 37.327650000000006 },
      { date: "2024-05-02", volume: 37.327650000000006 },
      { date: "2024-05-03", volume: 37.327650000000006 },
      { date: "2024-05-04", volume: 37.327650000000006 },
      { date: "2024-05-05", volume: 37.327650000000006 },
      { date: "2024-05-06", volume: 37.327650000000006 },
      { date: "2024-05-07", volume: 37.327650000000006 },
      { date: "2024-05-08", volume: 37.327650000000006 },
      { date: "2024-05-09", volume: 37.327650000000006 },
      { date: "2024-05-10", volume: 37.327650000000006 },
      { date: "2024-05-11", volume: 37.327650000000006 },
      { date: "2024-05-12", volume: 37.327650000000006 },
      { date: "2024-05-13", volume: 37.327650000000006 },
      { date: "2024-05-14", volume: 37.327650000000006 },
      { date: "2024-05-15", volume: 37.327650000000006 },
      { date: "2024-05-16", volume: 37.327650000000006 },
      { date: "2024-05-17", volume: 37.327650000000006 },
      { date: "2024-05-18", volume: 37.327650000000006 },
      { date: "2024-05-19", volume: 37.327650000000006 },
      { date: "2024-05-20", volume: 37.327650000000006 },
      { date: "2024-05-21", volume: 37.327650000000006 },
      { date: "2024-05-22", volume: 37.327650000000006 },
      { date: "2024-05-23", volume: 37.327650000000006 },
      { date: "2024-05-24", volume: 37.327650000000006 },
      { date: "2024-05-25", volume: 37.327650000000006 },
      { date: "2024-05-26", volume: 37.327650000000006 },
      { date: "2024-05-27", volume: 37.327650000000006 },
      { date: "2024-05-28", volume: 37.327650000000006 },
      { date: "2024-05-29", volume: 37.327650000000006 },
      { date: "2024-05-30", volume: 37.327650000000006 },
      { date: "2024-05-31", volume: 37.327650000000006 },
      { date: "2024-06-01", volume: 37.327650000000006 },
      { date: "2024-06-02", volume: 37.327650000000006 },
      { date: "2024-06-03", volume: 37.327650000000006 },
      { date: "2024-06-04", volume: 37.327650000000006 },
      { date: "2024-06-05", volume: 37.327650000000006 },
      { date: "2024-06-06", volume: 37.327650000000006 },
      { date: "2024-06-07", volume: 37.327650000000006 },
      { date: "2024-06-08", volume: 37.327650000000006 },
      { date: "2024-06-09", volume: 37.327650000000006 },
      { date: "2024-06-10", volume: 37.327650000000006 },
      { date: "2024-06-11", volume: 37.327650000000006 },
      {
        timestamp: "1718186643",
        date: "2024-06-12T10:04:03.000Z",
        volume: 124425.50000000001,
      },
    ],
  },
  {
    tokenA: {
      name: "Bitcoin",
      contract: "CALKW2CK75YNJTLWPIC5N2USY5ETLHNGQ5VFP4GC36JP6O7ZH3COCZJ7",
      code: "BTC",
      icon: "https://static.ultrastellar.com/media/assets/img/c3380651-52e5-4054-9121-a438c60a1ec4.png",
      decimals: 7,
    },
    tokenB: {
      name: "Dogstar",
      contract: "CDPU5TPNUMZ5JY3AUSENSINOEB324WI65AHI7PJBUKR3DJP2ULCBWQCS",
      code: "XTAR",
      icon: "https://www.dogstarcoin.com/assets/img/dogstarcoin-logo.png",
      decimals: 7,
    },
    address: "CBPTF2EOIGEA4ULLK3NCQLL65B7IQTXY6JUJZ3XTRM2YIKSZY26WHCTW",
    reserveA: "85946071047",
    reserveB: "85983597774",
    tokenAPrice: 0.62046,
    tokenBPrice: 0.6221275,
    fees24h: 0,
    feesYearly: 0,
    liquidity: 0,
    tvl: 10681.885996596582,
    volume24h: 0,
    volume7d: 0,
    tvlChartData: [{ date: "2024-06-12", tvl: 0 }],
    volumeChartData: [{ date: "2024-06-12", volume: 0 }],
  },
];

console.log(stubbedData);

export const getSoroswapTokens = async (): Promise<{
  assets: {
    code: string;
    contract: string;
    decimals: number;
    domain: string;
    icon: string;
    issuer: string;
  }[];
}> => {
  const { data } = await axios.get("https://api.soroswap.finance/api/tokens");

  return data.find((d: { network: string }) => d.network === "testnet");
};

interface SoroswapGetBestPathParams {
  amount: number;
  sourceContract: string;
  sourceDecimals: number;
  destContract: string;
  destDecimals: number;
  networkDetails: NetworkDetails;
}

export const soroswapGetBestPath = async ({
  amount,
  sourceContract,
  sourceDecimals,
  destContract,
  destDecimals,
  networkDetails,
}: SoroswapGetBestPathParams) => {
  if (!isTestnet(networkDetails)) {
    throw "Network not supported";
  }

  const network = Networks.TESTNET;

  const sourceToken = new Token(network, sourceContract, sourceDecimals);

  const destToken = new Token(network, destContract, destDecimals);

  console.log(sourceContract);
  console.log(destContract);

  const router = new Router({
    getPairsFn: async () => {
      const { data } = await axios.get(
        "https://info.soroswap.finance/api/pairs?network=TESTNET",
      );

      if (typeof data[0].tokenA === "object") {
        console.log(
          data.map(
            (d: {
              tokenA: { contract: string };
              tokenB: { contract: string };
            }) => ({
              ...d,
              tokenA: d.tokenA.contract,
              tokenB: d.tokenB.contract,
            }),
          ),
        );
        return data.map(
          (d: {
            tokenA: { contract: string };
            tokenB: { contract: string };
          }) => ({
            ...d,
            tokenA: d.tokenA.contract,
            tokenB: d.tokenB.contract,
          }),
        );
      }

      return data;
    },
    pairsCacheInSeconds: 60,
    protocols: [Protocols.SOROSWAP],
    network: network,
    maxHops: 5,
  });

  const currencyAmount = CurrencyAmount.fromRawAmount(sourceToken, amount);
  const quoteCurrency = destToken;

  const route = await router.route(
    currencyAmount,
    quoteCurrency,
    TradeType.EXACT_INPUT,
    "CBRR266UONXDUG3W57V2X5XCXT77RDK27LJE4QVKH2UTHYZGXPW5HBCT",
  );

  console.log(route?.trade);

  return route?.trade || null;
};

export const swap = async () => {
  const XLM_ADDRESS =
    "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
  const USDC_ADDRESS =
    "CCKW6SMINDG6TUWJROIZ535EW2ZUJQEDGSKNIK3FBK26PAMBZDVK2BZA";

  const XLM_TOKEN = new Token(
    Networks.TESTNET,
    XLM_ADDRESS,
    7,
    "XLM",
    "Stellar Lumens",
  );

  const USDC_TOKEN = new Token(
    Networks.TESTNET,
    USDC_ADDRESS,
    7,
    "USDC",
    "USD Coin",
  );

  const amount = 10000000; // In stellar Stroops

  // const router = new Router({
  //   pairsCacheInSeconds: 20, // pairs cache duration
  //   protocols: [Protocols.SOROSWAP], // protocols to be used
  //   network: Networks.TESTNET, // network to be used
  // });

  const router = new Router({
    getPairsFn: async () => {
      // const { data } = await axios.get(
      //   "https://info.soroswap.finance/api/pairs?network=TESTNET",
      // );

      // return data;
      return Promise.resolve([
        {
          tokenA: USDC_ADDRESS,
          tokenB: XLM_ADDRESS,
          reserveA: "6019011995679",
          reserveB: "5225492708",
        },
      ]);
    },
    pairsCacheInSeconds: 60,
    protocols: [Protocols.SOROSWAP],
    network: Networks.TESTNET,
    maxHops: 5,
  });

  const currencyAmount = CurrencyAmount.fromRawAmount(XLM_TOKEN, amount);
  const quoteCurrency = USDC_TOKEN;

  console.log(currencyAmount);
  console.log(quoteCurrency);

  console.log(1);

  const route = await router.route(
    currencyAmount,
    quoteCurrency,
    TradeType.EXACT_INPUT,
    "CBRR266UONXDUG3W57V2X5XCXT77RDK27LJE4QVKH2UTHYZGXPW5HBCT",
  );

  console.log(route?.trade?.path);

  const Sdk = getSdk(TESTNET_NETWORK_DETAILS.networkPassphrase);
  const server = stellarSdkServer(
    TESTNET_NETWORK_DETAILS.networkUrl,
    TESTNET_NETWORK_DETAILS.networkPassphrase,
  );

  const sorobanServer = buildSorobanServer(
    TESTNET_NETWORK_DETAILS.sorobanRpcUrl || "",
    TESTNET_NETWORK_DETAILS.networkPassphrase,
  );

  const createTx = async (
    routerAddress: string,
    method: string,
    params: any,
  ) => {
    const createTxBuilder = async (
      account: Account,
    ): Promise<TransactionBuilder> => {
      try {
        return new Sdk.TransactionBuilder(account, {
          fee: BASE_FEE,
          timebounds: { minTime: 0, maxTime: 0 },
          networkPassphrase: TESTNET_NETWORK_DETAILS.networkPassphrase,
        });
      } catch (e: any) {
        console.error(e);
        throw Error("unable to create txBuilder");
      }
    };
    const contractInstance = new Contract(routerAddress);
    const contractOperation = contractInstance.call(method, ...params);
    const acc = await server.loadAccount(
      "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
    );
    const txBuilder = await createTxBuilder(acc);
    txBuilder.addOperation(contractOperation);
    const tx = txBuilder.build();
    return tx;
  };

  const invokeTransaction = async (tx: Transaction, source: Keypair) => {
    const simulatedTx = await sorobanServer.simulateTransaction(tx);
    //If you only want to review the transaction, you can return the simulatedTx object to explore it in detail.
    // return simulatedTx;

    console.log(simulatedTx);

    const assemble_tx = SorobanRpc.assembleTransaction(tx, simulatedTx).build();
    // sim_tx_data.resourceFee(
    //   xdr.Int64.fromString((Number(sim_tx_data.resourceFee().toString()) + 100000).toString())
    // );
    // const prepped_tx = assemble_tx.setSorobanData(sim_tx_data).build();
    // prepped_tx.sign(source);
    // const tx_hash = prepped_tx.hash().toString("hex");

    assemble_tx.sign(source);

    console.log("submitting tx...");
    // let response = await sorobanServer.sendTransaction(assemble_tx);
    // let status = response.status;

    // console.log(response);
    return "submitted";
  };

  const account = Sdk.Keypair.fromSecret(
    "SANJ4VT7GYJKGOOFA6ABL5GCOTUVI57N3H2JLMLFUAJ6VDOJ6UFGZMAB",
  );

  const method = "swap_exact_tokens_for_tokens";
  const amount_in = 2500000; //In stellar stroops
  const amount_out_min = 0; //In stellar stroops
  const path = route?.trade?.path || ["", ""];
  console.log(path);
  const path2 = path.map((address) => new Sdk.Address(address));
  console.log(path2);

  const pathScVal = nativeToScVal(path2);

  console.log(pathScVal);

  const swapParams: xdr.ScVal[] = [
    nativeToScVal(amount_in, { type: "i128" }),
    nativeToScVal(amount_out_min, { type: "i128" }),
    pathScVal,
    new Address(
      "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
    ).toScVal(),
    nativeToScVal(Date.now() + 3600000, { type: "u64" }),
  ];

  const tx = await createTx(
    "CB74KXQXEGKGPU5C5FI22X64AGQ63NANVLRZBS22SSCMLJDXNHED72MO",
    method,
    swapParams,
  );

  // console.log(invokeTransaction);

  // console.log(tx);
  // console.log(account);
  const res = await invokeTransaction(tx, account);

  console.log(res);
};
