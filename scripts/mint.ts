import { ethers } from "hardhat";

const URL = "pinata url";
const CONTRACT_ADDRESS = "";

async function main() {
  const [deployer, receiver] = await ethers.getSigners();
  
  const deployed = await ethers.getContractAt("Token", CONTRACT_ADDRESS);

  const deployerAddress = await deployer.getAddress();
  console.log("Deployer address:", deployerAddress);
  const token = await deployed.addNewToken(URL);
  console.log("minted token:", token);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
