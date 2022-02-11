#!/usr/bin/env bash

npx hardhat compile; npx hardhat run scripts/deploy.ts --emoji --network kovan;
