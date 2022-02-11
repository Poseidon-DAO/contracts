import { ContractFactory } from "@ethersproject/contracts";
import { BigNumber } from "@ethersproject/contracts/node_modules/@ethersproject/bignumber";
import { ethers } from "hardhat";

// https://docs.ethers.io/v5/api/utils/display-logic/#display-logic--units
// ethers.utils.formatEther utilities reference

async function estimateCost(token: ContractFactory): Promise<BigNumber> {
  const deploymentData = token.interface.encodeDeploy([])
  const estimatedGas = await ethers.provider.estimateGas({ data: deploymentData });
  return estimatedGas
}

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    "Deploying contracts with the account address:",
    deployer.address
  );

  const balance = await deployer.getBalance();
  console.log("Account balance:", ethers.utils.formatEther(balance));

  const Token = await ethers.getContractFactory("Token");

  const estimatedGas = await estimateCost(Token);
  console.log("Deploy estimate cost:", ethers.utils.formatEther(estimatedGas));

  const deployed = await Token.deploy();
  console.log("Smart contract deployed. Token address:", deployed.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
