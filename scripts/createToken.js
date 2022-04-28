const hre = require("hardhat");

async function main() {

    // CREATE TOKEN

    const accountabilityAddress = "0xd268Bd93Cc7Ed8e8107F2825Cb5c7Ab7E84959E6";
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