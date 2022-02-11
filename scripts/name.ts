import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "";

async function main() {
  const [deployer, receiver] = await ethers.getSigners();

  const deployed = await ethers.getContractAt("Token", CONTRACT_ADDRESS);

  const name = await deployed.name();
  const symbol = await deployed.symbol();
  console.log("Contract: ", name, symbol);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
