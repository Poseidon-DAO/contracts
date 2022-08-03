const hre = require("hardhat");

async function main() {

    // CREATE TOKEN

    const ERC20PDN = await hre.ethers.getContractFactory("ERC20_PDN");
    const ERC20PDNDeploy = await ERC20PDN.deploy();
    await ERC20PDNDeploy.initialize("Poseidon DAO Token", "PDN", 1000000000, 18);

    const ERC1155PDN = await hre.ethers.getContractFactory("ERC1155_PDN");
    const ERC1155PDNDeploy = await ERC1155PDN.deploy();
    await ERC1155PDNDeploy.initialize("#", ERC20PDNDeploy.address);

    console.log("ERC20PDN deployed to:", ERC20PDNDeploy.address);
    console.log("ERC1155PDN deployed to:", ERC1155PDNDeploy.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });