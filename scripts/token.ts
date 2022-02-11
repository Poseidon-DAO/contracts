import { ethers } from "hardhat";

const CONTRACT_ADDRESS = "";
const TOKEN_ID = 0;

async function main() {
  const [deployer, receiver] = await ethers.getSigners();

  const deployed = await ethers.getContractAt("Token", CONTRACT_ADDRESS);

  const uri = await deployed.tokenURI(TOKEN_ID);
  console.log("Token URI: ", uri);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
