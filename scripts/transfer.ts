import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "";
const RECEIVER = "";
const TOKEN_ID = 0;

async function main() {
  const [deployer, receiver] = await ethers.getSigners();

  const deployed = await ethers.getContractAt("Token", CONTRACT_ADDRESS);

  const deployerAddress = await deployer.getAddress();
  console.log("Deployer address:", deployerAddress);
  const transfer = await deployed.transfer(RECEIVER, TOKEN_ID);
  console.log("token transfer:", transfer);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
