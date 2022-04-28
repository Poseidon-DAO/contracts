import { config as dotEnvConfig } from "dotenv";
dotEnvConfig();

import { HardhatUserConfig } from "hardhat/types";

import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-etherscan";
import "hardhat-abi-exporter";
import "@nomiclabs/hardhat-web3";
// TODO: reenable solidity-coverage when it works
// import "solidity-coverage";
const mocha = require("./mocha-config");

const INFURA_API_KEY = process.env.INFURA_API_KEY || "";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const MNEMONIC = process.env.MNEMONIC || "";

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  mocha,
  solidity: {
    // compilers: [{ version: "0.4.18", settings: {} }],
    // compilers: [{ version: "0.5.0", settings: {} }],
    // compilers: [{ version: "0.7.6", settings: {} }],
    compilers: [{ version: "0.8.0"}, {version: "0.8.1"}, {version: "0.8.3", settings: {} }],
  },
  abiExporter: {
    path: './abi',
    clear: true,
    flat: true,
    // only: [':ERC721$'],
    spacing: 2
  },
  networks: {
    hardhat: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 10
      }
    },
    localhost: {
      accounts: {
        mnemonic: MNEMONIC,
        path: "m/44'/60'/0'/0",
        initialIndex: 0,
        count: 10
      }
    },
    coverage: {
      url: "http://127.0.0.1:8555", // Coverage launches its own ganache-cli client
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
};

export default config;