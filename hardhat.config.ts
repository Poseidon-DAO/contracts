require('dotenv').config();
require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");

const { API_URL, PRIVATE_KEY } = process.env;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;

module.exports = {
    solidity: {
        // compilers: [{ version: "0.4.18", settings: {} }],
        // compilers: [{ version: "0.5.0", settings: {} }],
        // compilers: [{ version: "0.7.6", settings: {} }],
        compilers: [
            {
            version: "0.8.0"
            },
            {
            version: "0.8.1"
            }, 
            {
            version: "0.8.3", 
            settings: {} 
            }
        ],
    },
    defaultNetwork: "rinkeby",
    networks: {
        hardhat: {},
        rinkeby: {
            url: API_URL,
            accounts: [`0x${PRIVATE_KEY}`]
        },
        mainnet: {
            url: API_URL,
            accounts: [`0x${PRIVATE_KEY}`]
        }
    },
    etherscan: {
        // Your API key for Etherscan
        // Obtain one at https://etherscan.io/
        apiKey: ETHERSCAN_API_KEY
    }
};