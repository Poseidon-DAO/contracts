const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { ethers } = require('hardhat');

const showLog = false;
async function deploy() {
  const DAOSetupContractFactory = await ethers.getContractFactory("DAOSetup");
  return await DAOSetupContractFactory.deploy();
}


describe("DAO Setup", function () {
  let DAOSetup;

  beforeEach(async () => {
    DAOSetup = await deploy();
  });

  it("DAO Creator is who create the DAO", async function () {
    const [owner] = await ethers.getSigners();
    expect(await DAOSetup.getDAOCreator()).to.equal(await owner.getAddress());
  });

  it("Stranger Address is not the DAO Creator", async function () {
    const [owner, stranger] = await ethers.getSigners();
    expect(await DAOSetup.getDAOCreator()).to.not.equal(await stranger.getAddress());
  });

  it("Check if the underlier smartcontracts belongs to the DAO itself by event", async function () {
    const SmartContractList = await DAOSetup.getDAOSmartContractList();
    const [owner] = await ethers.getSigners();
    for(let index = 0; index < SmartContractList.length; index++){
        expect(SmartContractList[index]).to.emit(DAOSetup, 'extendDAOEvent').withArgs(owner.getAddress(),SmartContractList[index]);
    }
    if(showLog) console.log("Checked Addresses: ")
    if(showLog) console.log(SmartContractList);
  });

  it("Check if the underlier smartcontracts belongs to the DAO itself by function", async function () {
    const SmartContractList = await DAOSetup.getDAOSmartContractList();
    const [owner] = await ethers.getSigners();
    for(let index = 0; index < SmartContractList.length; index++){
        expect(await DAOSetup.checkIfSmartContractIsInsideTheDAO(SmartContractList[index])).to.equals(true);
    }
    if(showLog) console.log("Checked Addresses: ")
    if(showLog) console.log(SmartContractList);
  });

  it("Owner can extend DAO", async function () {
    const [owner, secondAddress, thirdAddress] = await ethers.getSigners();
    const smartContractList = await DAOSetup.getDAOSmartContractList();
    const smartContractListLength = smartContractList.length;
    const arrayListOfAddresses = [secondAddress.address, thirdAddress.address]
    let tx = await DAOSetup.connect(owner).extendDAO(arrayListOfAddresses);
    const newSmartContractList = await DAOSetup.getDAOSmartContractList();
    const newSmartContractListLength = newSmartContractList.length;
    expect(await DAOSetup.checkIfSmartContractIsInsideTheDAO(newSmartContractList[newSmartContractListLength - 1])).to.equals(true);
    expect(newSmartContractListLength).to.equals(smartContractListLength + arrayListOfAddresses.length);
    if(showLog) console.log("Checked Addresses: ")
    if(showLog) console.log(smartContractList);
    if(showLog) console.log("Checked New Addresses: ")
    if(showLog) console.log(newSmartContractList);
  });

  it("Stranger can't extend DAO", async function () {
    const [owner, stranger, secondAddress, thirdAddress] = await ethers.getSigners();
    const smartContractList = await DAOSetup.getDAOSmartContractList();
    const smartContractListLength = smartContractList.length;
    const arrayListOfAddresses = [secondAddress.address, thirdAddress.address]
    await expect(DAOSetup.connect(stranger).extendDAO(arrayListOfAddresses)).to.be.revertedWith("ONLY_CREATOR_CAN_EXTEND_DAO");
  });

});

  //   const [deployer, receiver] = await ethers.getSigners();

  //   const deployerAddress = await deployer.getAddress();
  //   await deployed.whitelistCreator(deployerAddress);

  //   await deployed.addNewToken(testURL);
  //   await deployed.setSalePrice(1, 5);

  //   await expect(deployed.connect(receiver).buy(1, { value: 6 }))
  //     .to.emit(deployed, "Sold");

  //   expect(await deployed.ownerOf(1)).to.equal(await receiver.getAddress());
  //   expect(await deployed.tokenURI(1)).to.equal(testURL);