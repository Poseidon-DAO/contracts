const hre = require("hardhat");

//ubuntu@ubuntu-Surface-Pro-7:~/Documents/GitHub/contracts$ npx hardhat run --network rinkeby ./scripts/publish.js

async function main() {

    let smartContractList = [];

    const multisigAddressList = ["0xB6097b6932ad88D1159c10bA7D290ba05087507D", "0x7db3c4099660a6f33bBfF63B3318CBf9b4D07743", "0x0a767592E4C4CbD5A65BAc08bd3c7112d68496A5", "0x3d6AD09Ed37447b963A7f5470bF6C0003D36dEe3", "0xDc3A186fB898669023289Fd66b68E4016875E011"];

    // ACCESSIBILITY SETTINGS

    const AccessibilitySettings = await hre.ethers.getContractFactory("AccessibilitySettings");
    const accessibilitySettings = await AccessibilitySettings.deploy();
    await accessibilitySettings.initialize();

    console.log("AccessibilitySettings deployed to:", accessibilitySettings.address);
    smartContractList.push(accessibilitySettings.address);

    // MULTISIG

    const MultiSig = await hre.ethers.getContractFactory("MultiSig");
    const multisig = await MultiSig.deploy();
    await multisig.initialize(accessibilitySettings.address, multisigAddressList);

    console.log("MultiSig deployed to:", multisig.address);
    smartContractList.push(multisig.address);

    // ACCOUNTABILITY 

    const SECURITY_DELAY = 120; // number of blocks
    const Accountability = await hre.ethers.getContractFactory("Accountability");
    const accountability = await Accountability.deploy();
    await accountability.initialize(accessibilitySettings.address, SECURITY_DELAY);

    console.log("Accountability deployed to:", accountability.address);  
    smartContractList.push(accountability.address);

    // ERC20 PDN TOKEN

    const TokenERC20PDN = await hre.ethers.getContractFactory("ERC20_PDN");
    const tokenERC20PDN = await TokenERC20PDN.deploy();
    await tokenERC20PDN.initialize("Poseidon DAO Token", "PDN", 1000000000, 18);

    console.log("TokenERC20PDN deployed to:", tokenERC20PDN.address);  
    smartContractList.push(tokenERC20PDN.address);

    // ERC1155 PDN TOKEN

    const TokenERC1155PDN = await hre.ethers.getContractFactory("ERC1155_PDN");
    const tokenERC1155PDN = await TokenERC1155PDN.deploy();
    await tokenERC1155PDN.initialize("#", tokenERC20PDN.address);

    console.log("TokenERC1155PDN deployed to:", tokenERC1155PDN.address);
    smartContractList.push(tokenERC1155PDN.address);

    // SMART CONTRACT VERIFICATION

    const { exec } = require('child_process');
    const network = 'rinkeby';
    exec('npx hardhat verify --network '+network+' '+smartContractList[0], (err, stdout, stderr) => {console.log(err)});
    exec('npx hardhat verify --network '+network+' '+smartContractList[1], (err, stdout, stderr) => {console.log(err)});
    exec('npx hardhat verify --network '+network+' '+smartContractList[2], (err, stdout, stderr) => {console.log(err)});
    exec('npx hardhat verify --network '+network+' '+smartContractList[3], (err, stdout, stderr) => {console.log(err)});
    exec('npx hardhat verify --network '+network+' '+smartContractList[4], (err, stdout, stderr) => {console.log(err)});

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  /*
    LAST RUN OUTPUT:
    AccessibilitySettings deployed to: 0x026e5E76A15de3803607A02e9FbB673B93f6AF66
    MultiSig deployed to: 0x92ce6dAf3D7e6F7c38da79f9e65026c529588069
    Accountability deployed to: 0x6520d0735A3B61495dc7C1D68f8980a692c8b3b3
    TokenERC20PDN deployed to: 0x0c016620Fc67a1CDb63c271867d1f08182dc880b
    TokenERC1155PDN deployed to: 0xa53387BBf32b94d3F4bac3BE2448B6ba1C993A82
  */

    /*
 
Mauro Tommasi
Rinkeby Testnet
Pbl: 0xB6097b6932ad88D1159c10bA7D290ba05087507D
Pvt: 0x05da23ac61f6033d09e69470b9b1f6afcc98214451b78164ee0017e474ebd75a
Pbl: 0x7db3c4099660a6f33bBfF63B3318CBf9b4D07743
Pvt: 0x9723825bcb901c7fa2bb209763eb12d02a2fa233f3b31bda1c9256c2c76507e5
Pbl: 0x0a767592E4C4CbD5A65BAc08bd3c7112d68496A5
Pvt: 0x9e5173918505a0917dbb5a2c40ecdeecb11fb48f88dc5a9e84a968174dc2910f
Pbl: 0x3d6AD09Ed37447b963A7f5470bF6C0003D36dEe3
Pvt: 0xc41927c6c49d5e09b0b6b93be73f1420ed6b381614fbb824f37af79fe78480cd
Owner
Pbl: 0xDc3A186fB898669023289Fd66b68E4016875E011
Pvt: 0x17793bb885773856ac0a6f534f9484e74c1164bd545659b95419c430bbba5904

    */