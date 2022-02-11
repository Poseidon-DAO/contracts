#!/usr/bin/env bash

truffle migrate --reset --network ganache

npx hardhat clean; npx hardhat compile; npx hardhat run scripts/deploy.ts --emoji;
