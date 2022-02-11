# Poseidon DAO Smart Contracts

<div>
  <a href="https://www.ethereum.org/" target="_blank"><img src="https://img.shields.io/badge/platform-Ethereum-brightgreen.svg?style=flat-square" alt="Ethereum" /></a>
  <a href="https://ethereum.org/en/developers/docs/standards/tokens/erc-20/" target="_blank"><img src="https://img.shields.io/badge/token-ERC20-ff69b4.svg?style=flat-square" alt="Token ERC20" /> </a>
</div>

## Development

In order to get started install node dependencies:

> yarn install

*NOTE*: node version `>=14.14.0` required. Set stable fermium version for development

> nvm use lts/fermium

List of common required commands during development

Run hardhat locally:

> npx hardhat node

Connect to hardhat node from console:

> npx hardhat node

In the console deploy the smart contract:

> const Token = await ethers.getContractFactory("Token")
> deployed = await Token.deploy()

Get deployer:
> [deployer] = await ethers.getSigners()

Get deployer address:

> address = await deployer.getAddress()
