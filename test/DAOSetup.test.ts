const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { waffle, ethers } = require('hardhat');
const { web3 } = require('web3')
const Web3Utils = require('web3-utils');
const showLog = false;

const BYTES4DATA = [Web3Utils.toHex('A1B2'), Web3Utils.toHex('B2C3')];

async function setupDAODeploy() {
  const DAOSetupContractFactory = await ethers.getContractFactory("DAOSetup");
  return await DAOSetupContractFactory.deploy();
}

async function accessibilitySettingsDeploy(owner) {
  const AccesibilitySettingsContractFactory = await ethers.getContractFactory("AccessibilitySettings");
  return await AccesibilitySettingsContractFactory.deploy(owner);
}

async function accountabilityDeploy(accessibilitySettingsAddress, owner) {
  const AccesibilitySettingsContractFactory = await ethers.getContractFactory("Accountability");
  return await AccesibilitySettingsContractFactory.deploy(accessibilitySettingsAddress, owner);
}

describe("Unit Test: DAO Setup", function () {
  let DAOSetup;
  let smartContractsDAO;
  let owner, add1, add2, add3, add4;

  beforeEach(async () => {
    // Deploy DAO
    DAOSetup = await setupDAODeploy();
    const events = await DAOSetup.queryFilter(DAOSetup.filters.extendDAOEvent());
    smartContractsDAO = new Array();
    // Get Smart Contract List
    events.forEach(event => {
        smartContractsDAO.push(event.args.newSmartContractAddress);
    });
    // Get Test Addresses
    [owner, add1, add2, add3, add4] = await ethers.getSigners();
  });

  it("DAO Creator is who create the DAO", async function () {
    expect(await DAOSetup.getDAOCreator()).to.equal(await owner.address);
    if(showLog) console.log(owner.address);

  });

  it("Stranger Address is not the DAO Creator", async function () {
    expect(await DAOSetup.getDAOCreator()).to.not.equal(await add1.address);
  });

  it("Owner can extend DAO", async function () {
    const arrayListOfAddresses = await [add2.address, add3.address]
    await DAOSetup.connect(owner).extendDAO(arrayListOfAddresses);
    const events = await DAOSetup.queryFilter(DAOSetup.filters.extendDAOEvent());
    expect(events[0].args.newSmartContractAddress).to.equals(smartContractsDAO[0]);             // OLD
    expect(events[1].args.newSmartContractAddress).to.equals(smartContractsDAO[1]);             // OLD
    expect(events[2].args.newSmartContractAddress).to.equals(arrayListOfAddresses[0]);          // NEW
    expect(events[3].args.newSmartContractAddress).to.equals(arrayListOfAddresses[1]);          // NEW
    expect(events.length).to.equals(smartContractsDAO.length + arrayListOfAddresses.length);    // LENGTH CHECK
  });

  it("Stranger can't extend DAO", async function () {
    const arrayListOfAddresses = [add2.address, add3.address]
    await expect(DAOSetup.connect(add1).extendDAO(arrayListOfAddresses)).to.be.revertedWith("ONLY_CREATOR_CAN_EXTEND_DAO");
  });

  it("Check if a smart contract address belongs to the DAO", async function () {
    expect(await DAOSetup.checkIfSmartContractIsInsideTheDAO(smartContractsDAO[0])).to.equals(true);
  });

  it("Check if a smart contract address doesn't belong to the DAO", async function () {
    expect(await DAOSetup.checkIfSmartContractIsInsideTheDAO(add2.address)).to.equals(false);
  });
});

describe("Integrate Test: SetupDAO - Accessibility Settings", function () {
  let DAOSetup;
  let smartContractsDAO;
  let IAccessibilitySettings
  let owner;
  beforeEach(async () => {
    // Deploy DAO
    DAOSetup = await setupDAODeploy();
    const events = await DAOSetup.queryFilter(DAOSetup.filters.extendDAOEvent());
    smartContractsDAO = new Array();
    // Get Smart Contract List
    events.forEach(event => {
        smartContractsDAO.push(event.args.newSmartContractAddress);
    });
    // Get Test Addresses
    [owner] = await ethers.getSigners();
    IAccessibilitySettings = await ethers.getContractAt("IAccessibilitySettings", smartContractsDAO[0]);
  });

  it("Who creates the DAO is superAdmin of Accessibility Settings", async function () {
    expect(await IAccessibilitySettings.getDAOCreator()).to.equal(await owner.address);
    if(showLog) console.log(owner.address);
  });

});

describe("Unit Test: Can't Deploy Accessibility Settings if DAO Creator is set to NULL", function () {

  it("Can't Deploy for accessibilitySettings NULL Address", async function () {
    await expect(accessibilitySettingsDeploy(ZERO_ADDRESS)).to.be.revertedWith("CANT_SET_NULL_ADDRESS");
  });

});

describe("Unit Test: Accessibility Settings", function () {
  let accessibilitySettings
  let owner, add1, add2, add3, add4;

  beforeEach(async () => {
    // Get Test Addresses
    [owner, add1, add2, add3, add4] = await ethers.getSigners();
    accessibilitySettings = await accessibilitySettingsDeploy(owner.address);
  });

  it("Enable signature", async function () {
    const groupIndexList = [2, 3];
    await accessibilitySettings.connect(add1).enableSignature(BYTES4DATA, groupIndexList);
    const events = await accessibilitySettings.queryFilter(accessibilitySettings.filters.ChangeGroupAccessibilityEvent());;
    expect(events[0].args.smartContractReference).to.equals(add1.address);
    expect(events[0].args.functionSignature).to.equals(BYTES4DATA[0]);
    expect(events[0].args.groupReference).to.equals(groupIndexList[0]);
    expect(events[0].args.Accessibility).to.equals(true);
    expect(events[1].args.smartContractReference).to.equals(add1.address);
    expect(events[1].args.functionSignature).to.equals(BYTES4DATA[0]);
    expect(events[1].args.groupReference).to.equals(groupIndexList[1]);
    expect(events[1].args.Accessibility).to.equals(true);
    expect(events[2].args.smartContractReference).to.equals(add1.address);
    expect(events[2].args.functionSignature).to.equals(BYTES4DATA[1]);
    expect(events[2].args.groupReference).to.equals(groupIndexList[0]);
    expect(events[2].args.Accessibility).to.equals(true);
    expect(events[3].args.smartContractReference).to.equals(add1.address);
    expect(events[3].args.functionSignature).to.equals(BYTES4DATA[1]);
    expect(events[3].args.groupReference).to.equals(groupIndexList[1]);
    expect(events[3].args.Accessibility).to.equals(true);
  });

  it("Disable signature", async function () {
    const groupIndexList = [2, 3];    accessibilitySettings = await accessibilitySettingsDeploy(owner.address);

    const disableGroupIndexList = [3];
    await accessibilitySettings.connect(add1).enableSignature(BYTES4DATA, groupIndexList);
    await accessibilitySettings.connect(add1).disableSignature(BYTES4DATA, disableGroupIndexList);
    const events = await accessibilitySettings.queryFilter(accessibilitySettings.filters.ChangeGroupAccessibilityEvent());;
    expect(events[4].args.smartContractReference).to.equals(add1.address);
    expect(events[4].args.functionSignature).to.equals(BYTES4DATA[0]);
    expect(events[4].args.groupReference).to.equals(groupIndexList[1]);
    expect(events[4].args.Accessibility).to.equals(false);
    expect(events[5].args.smartContractReference).to.equals(add1.address);
    expect(events[5].args.functionSignature).to.equals(BYTES4DATA[1]);
    expect(events[5].args.groupReference).to.equals(groupIndexList[1]);
    expect(events[5].args.Accessibility).to.equals(false);
  });

  it("Can't Enable Empty Group Index", async function () {
    await expect(accessibilitySettings.connect(add1).enableSignature(BYTES4DATA, [])).to.be.revertedWith("NO_USER_ROLES_DEFINED");
  });

  it("Can't Enable Empty Signatures", async function () {
    const groupIndexList = [2, 3];
    await expect(accessibilitySettings.connect(add1).enableSignature([], groupIndexList)).to.be.revertedWith("NO_SIGNATURES_DEFINED");
  });

  it("Can't Disable Empty Group Index", async function () {
    await expect(accessibilitySettings.connect(add1).disableSignature(BYTES4DATA, [])).to.be.revertedWith("NO_USER_ROLES_DEFINED");
  });

  it("Can't Disable Empty Signatures", async function () {
    const groupIndexList = [2, 3];
    await expect(accessibilitySettings.connect(add1).disableSignature([], groupIndexList)).to.be.revertedWith("NO_SIGNATURES_DEFINED");
  });

  it("Set User Role", async function () {
    const groupIndex = 2;
    await accessibilitySettings.connect(add1).setUserRole(add2.address, groupIndex);
    const events = await accessibilitySettings.queryFilter(accessibilitySettings.filters.ChangeUserGroupEvent());
    expect(events[0].args.caller).to.equals(add1.address);
    expect(events[0].args.user).to.equals(add2.address);
    expect(events[0].args.newGroup).to.equals(groupIndex);
  });

  it("Can't Set Null Address to User Role", async function () {
    const groupIndex = 2;
    await expect(accessibilitySettings.connect(add1).setUserRole(ZERO_ADDRESS, groupIndex)).to.be.revertedWith("CANT_SET_NULL_ADDRESS");
  });

  it("Set User Role List", async function () {
    const groupIndexList = [2, 3];
    const userList = [add2.address, add3.address];
    await accessibilitySettings.connect(add1).setUserListRole(userList, groupIndexList);
    const events = await accessibilitySettings.queryFilter(accessibilitySettings.filters.ChangeUserGroupEvent());;
    expect(events[0].args.caller).to.equals(add1.address);
    expect(events[0].args.user).to.equals(add2.address);
    expect(events[0].args.newGroup).to.equals(groupIndexList[0]);
    expect(events[1].args.caller).to.equals(add1.address);
    expect(events[1].args.user).to.equals(add3.address);
    expect(events[1].args.newGroup).to.equals(groupIndexList[1]);
    expect(events.length).to.equals(userList.length);
  });

  it("Can't Set User Roles if List Length Dismatch", async function () {
    const groupIndexList = [2, 3, 4];
    const userList = [add2.address, add3.address];
    await expect(accessibilitySettings.connect(add1).setUserListRole(userList, groupIndexList)).to.be.revertedWith("DATA_LENGTH_DISMATCH");
  });

  it("Can't Set Null Address in one of the User Role Elements ", async function () {
    const groupIndexList = [2, 3];
    const userList = [ZERO_ADDRESS, add3.address];
    await expect(accessibilitySettings.connect(add1).setUserListRole(userList, groupIndexList)).to.be.revertedWith("CANT_SET_NULL_ADDRESS");
  
  });

  it("Accessibility is true for enabled signatures and group if caller enabled it before", async function () {
    const groupIndexList = [2, 3];
    const userList = [add2.address, add3.address];
    const sampleSignature = BYTES4DATA[0];
    await accessibilitySettings.connect(add1).enableSignature(BYTES4DATA, groupIndexList);
    await accessibilitySettings.connect(add1).setUserListRole(userList, groupIndexList);
    expect(await accessibilitySettings.connect(add1).getAccessibility(sampleSignature, add2.address)).to.equals(true);
  });

  it("Accessibility is false for not enabled signatures but enabled group", async function () {
    const groupIndexList = [2, 3];
    const userList = [add2.address, add3.address];
    const sampleSignature = BYTES4DATA[0];
    await accessibilitySettings.connect(add1).setUserListRole(userList, groupIndexList);
    expect(await accessibilitySettings.connect(add1).getAccessibility(sampleSignature, add2.address)).to.equals(false);
  });

  it("Accessibility is false for enabled signatures but not enabled group", async function () {
    const groupIndexList = [2, 3];
    const userList = [add2.address, add3.address];
    const sampleSignature = BYTES4DATA[0];
    await accessibilitySettings.connect(add1).enableSignature(BYTES4DATA, groupIndexList);
    expect(await accessibilitySettings.connect(add1).getAccessibility(sampleSignature, add2.address)).to.equals(false);
  });

  it("Accessibility is false for disabled signatures and disabled group", async function () {
    const sampleSignature = BYTES4DATA[0];
    expect(await accessibilitySettings.connect(add1).getAccessibility(sampleSignature, add2.address)).to.equals(false);
  });


  it("Accessibility is false for uknown msg.sender", async function () {
    const groupIndexList = [2, 3];
    const userList = [add2.address, add3.address];
    const sampleSignature = BYTES4DATA[0];
    await accessibilitySettings.connect(add1).enableSignature(BYTES4DATA, groupIndexList);
    await accessibilitySettings.connect(add1).setUserListRole(userList, groupIndexList);
    expect(await accessibilitySettings.connect(add4).getAccessibility(sampleSignature, add2.address)).to.equals(false);
  });

  it("Get User Group for well know set user", async function () {
    const groupIndex = 2;
    await accessibilitySettings.connect(add1).setUserRole(add2.address, groupIndex);
    const events = await accessibilitySettings.queryFilter(accessibilitySettings.filters.ChangeUserGroupEvent());
    const getUserGroup = await accessibilitySettings.connect(add1).getUserGroup(add2.address);
    expect(events[0].args.caller).to.equals(add1.address);
    expect(events[0].args.user).to.equals(add2.address);
    expect(events[0].args.newGroup).to.equals(getUserGroup);
  });

  it("Default User Group is ZERO", async function () {
    const groupIndex = 2;
    const getUserGroup = await accessibilitySettings.connect(add1).getUserGroup(add2.address);
    expect(getUserGroup).to.equals(0);
  });


  it("SuperAdmin is the Dao Creator (check Integrate Test)", async function () {
    expect(await accessibilitySettings.connect(add1).getDAOCreator()).to.equals(owner.address);
  });
});

describe("Integrate Test: SetupDAO - Accountability", function () {
  let DAOSetup;
  let smartContractsDAO;
  let IAccountability
  let owner;

  beforeEach(async () => {
    // Deploy DAO
    DAOSetup = await setupDAODeploy();
    const events = await DAOSetup.queryFilter(DAOSetup.filters.extendDAOEvent());
    smartContractsDAO = new Array();
    // Get Smart Contract List
    events.forEach(event => {
        smartContractsDAO.push(event.args.newSmartContractAddress);
    });
    // Get Test Addresses
    [owner] = await ethers.getSigners();
    IAccountability = await ethers.getContractAt("IAccountability", smartContractsDAO[1]);
  });

  it("Who creates the DAO is superAdmin of Accountability", async function () {
    expect(await IAccountability.getDAOCreator()).to.equal(await owner.address);
    if(showLog) console.log(owner.address);
  });

});

describe("Unit Test: Can't Deploy Accountability if DAO Creator is set to NULL or Accessibility is NULL", function () {

  it("Can't Deploy for accessibilitySettings NULL Address", async function () {
    const [owner] = await ethers.getSigners();
    await expect(accountabilityDeploy(ZERO_ADDRESS, owner.address)).to.be.revertedWith("CANT_SET_NULL_ADDRESS");
  });

  it("Can't Deploy for DAO Creator NULL Address", async function () {
    const [owner] = await ethers.getSigners();
    const accessibilitySettings = await accessibilitySettingsDeploy(owner.address);
    await expect(accountabilityDeploy(accessibilitySettings.address, ZERO_ADDRESS)).to.be.revertedWith("CANT_SET_NULL_ADDRESS");
  });
});

describe("Unit Test: Accountability", function () {

  let accessibilitySettings;
  let IAccessibilitySettings;
  let accountability;
  let owner, add1, add2, add3, add4;

  beforeEach(async () => {
    [owner, add1, add2, add3, add4] = await ethers.getSigners();
    accessibilitySettings = await accessibilitySettingsDeploy(owner.address);
    accountability = await accountabilityDeploy(accessibilitySettings.address, owner.address);
  });

  it("Check if after depoly DAO Creator is in Admin User Group", async function () {
    expect(await accessibilitySettings.connect(accountability.address).getUserGroup(owner.address)).to.equal(1);
  });

  it("Check if after deploy the smart contract itself is in Admin User Group", async function () {
    expect(await accessibilitySettings.connect(accountability.address).getUserGroup(accountability.address)).to.equal(1);

  });
  it("Check if after deploy accessibilitySettings has enabled signatures for admin group", async function () {
    const signatures = await accountability.getFunctionSignatures();
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[0], owner.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[1], owner.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[2], owner.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[3], owner.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[0], accountability.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[1], accountability.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[2], accountability.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[3], accountability.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getUserGroup(owner.address)).to.equals(1);
    expect(await accessibilitySettings.connect(accountability.address).getUserGroup(accountability.address)).to.equals(1);
  });
});