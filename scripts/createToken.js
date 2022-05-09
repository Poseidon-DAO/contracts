const hre = require("hardhat");

async function main() {

    // CREATE TOKEN

    const accountabilityAddress = "0x6Aa7B5A9870c85Ff3a2eF0d947bEb50bA6Fa1ACf";
    const DynamicERC20Upgradeable = await hre.ethers.getContractFactory("DynamicERC20Upgradeable");
    const dynamicERC20Upgradeable = await DynamicERC20Upgradeable.deploy();
    await dynamicERC20Upgradeable.initialize(accountabilityAddress, "TOKEN_NAME", "TOKEN_SYMBOL", 18);

    console.log("DynamicERC20Upgradeable deployed to:", dynamicERC20Upgradeable.address);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });