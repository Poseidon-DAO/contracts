const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { waffle, ethers } = require('hardhat');
const { web3 } = require('web3')
const showLog = false;
async function deploy() {
  const DAOSetupContractFactory = await ethers.getContractFactory("DAOSetup");
  return await DAOSetupContractFactory.deploy();
}


describe("DAO Setup - Loading Core Functionalities", function () {
  let DAOSetup;
  let smartContractsDAO;

  beforeEach(async () => {
    DAOSetup = await deploy();
    const events = await DAOSetup.queryFilter(DAOSetup.filters.extendDAOEvent());
    // Get addresses of all smart contracts that belongs to the DAO
    smartContractsDAO = new Array();
    events.forEach(event => {
        smartContractsDAO.push(event.args.newSmartContractAddress);
    });
  });

  it("DAO Creator is who create the DAO", async function () {
    const [owner] = await ethers.getSigners();
    expect(await DAOSetup.getDAOCreator()).to.equal(await owner.getAddress());
    if(showLog) console.log(owner.address);

  });

  it("Stranger Address is not the DAO Creator", async function () {
    const [owner, stranger] = await ethers.getSigners();
    expect(await DAOSetup.getDAOCreator()).to.not.equal(await stranger.getAddress());
  });

  it("Owner can extend DAO", async function () {
    const [owner, secondAddress, thirdAddress] = await ethers.getSigners();
    const arrayListOfAddresses = [secondAddress.address, thirdAddress.address]
    await DAOSetup.connect(owner).extendDAO(arrayListOfAddresses);
    const events = await DAOSetup.queryFilter(DAOSetup.filters.extendDAOEvent());
    expect(events[0].args.newSmartContractAddress).to.equals(smartContractsDAO[0]);
    expect(events[1].args.newSmartContractAddress).to.equals(smartContractsDAO[1]);
    expect(events[2].args.newSmartContractAddress).to.equals(arrayListOfAddresses[0]);
    expect(events[3].args.newSmartContractAddress).to.equals(arrayListOfAddresses[1]);
    expect(events.length).to.equals(smartContractsDAO.length + arrayListOfAddresses.length);
  });

  it("Stranger can't extend DAO", async function () {
    const [owner, stranger, secondAddress, thirdAddress] = await ethers.getSigners();
    const arrayListOfAddresses = [secondAddress.address, thirdAddress.address]
    await expect(DAOSetup.connect(stranger).extendDAO(arrayListOfAddresses)).to.be.revertedWith("ONLY_CREATOR_CAN_EXTEND_DAO");
  });

  it("Check if a smart contract address belongs to the DAO", async function () {
    expect(await DAOSetup.checkIfSmartContractIsInsideTheDAO(smartContractsDAO[0])).to.equals(true);
  });

  it("Check if a smart contract address doesn't belong to the DAO", async function () {
    const [owner, secondAddress] = await ethers.getSigners();
    expect(await DAOSetup.checkIfSmartContractIsInsideTheDAO(secondAddress.getAddress())).to.equals(false);
  });
});
