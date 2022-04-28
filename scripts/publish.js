const hre = require("hardhat");

async function main() {

    const multisigAddressList = ["0xB6097b6932ad88D1159c10bA7D290ba05087507D", "0x7db3c4099660a6f33bBfF63B3318CBf9b4D07743", "0x0a767592E4C4CbD5A65BAc08bd3c7112d68496A5", "0x3d6AD09Ed37447b963A7f5470bF6C0003D36dEe3", "0xDc3A186fB898669023289Fd66b68E4016875E011"];

    // ACCESSIBILITY SETTINGS

    const AccessibilitySettings = await hre.ethers.getContractFactory("AccessibilitySettings");
    const accessibilitySettings = await AccessibilitySettings.deploy();
    await accessibilitySettings.initialize();

    console.log("AccessibilitySettings deployed to:", accessibilitySettings.address);

    // MULTISIG

    const MultiSig = await hre.ethers.getContractFactory("MultiSig");
    const multisig = await MultiSig.deploy();
    multisig.initialize(accessibilitySettings.address, multisigAddressList);

    console.log("MultiSig deployed to:", multisig.address);

    //ACCOUNTABILITY 

    const Accountability = await hre.ethers.getContractFactory("Accountability");
    const accountability = await Accountability.deploy();
    accountability.initialize(accessibilitySettings.address);

    console.log("Accountability deployed to:", accountability.address);  

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });