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
  const AccessibilitySettingsContractFactory = await ethers.getContractFactory("AccessibilitySettings");
  return await AccessibilitySettingsContractFactory.deploy(owner);
}

async function accountabilityDeploy(accessibilitySettingsAddress, owner) {
  const AccessibilitySettingsContractFactory = await ethers.getContractFactory("Accountability");
  return await AccessibilitySettingsContractFactory.deploy(accessibilitySettingsAddress, owner);
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

describe("Unit Test: Deploy Accessibility Settings", function () {

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


  it("Accessibility is false for unknown msg.sender", async function () {
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
  });

  it("Change Accessibility Settings if caller is DAO Creator", async function () {
    await accountability.connect(owner).changeAccessibilitySettings(add1.address);
    const events = await accountability.queryFilter(accountability.filters.ChangeAccessibilitySettingsAddressEvent());
    expect(events[0].args.owner).to.equal(owner.address);
    expect(events[0].args.accessibilitySettingsAddress).to.equal(add1.address);
  });

  it("Can't change Accessibility Settings if DAO Creator for NULL address", async function () {
    await expect(accountability.connect(owner).changeAccessibilitySettings(ZERO_ADDRESS)).to.be.revertedWith("CANT_SET_TO_NULL_ADDRESS");
  });

  it("Can't change Accessibility Settings if caller is not DAO Creator", async function () {
    await expect(accountability.connect(add1).changeAccessibilitySettings(add2.address)).to.be.revertedWith("ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
  });

  it("Can Disable Signatures if DAO Creator", async function () {
    const signatures = await accountability.getFunctionSignatures()
    const signaturesToDisable = [signatures[0], signatures[1]];
    const adminGroup = [1];
    // Check if are enabled yet
    expect(await accountability.connect(owner).getAccessibility(signatures[0])).to.equal(true);
    expect(await accountability.connect(owner).getAccessibility(signatures[1])).to.equal(true);
    await accountability.connect(owner).disableListOfSignaturesForGroupUser(signaturesToDisable, adminGroup);
    expect(await accountability.connect(owner).getAccessibility(signatures[0])).to.equal(false);
    expect(await accountability.connect(owner).getAccessibility(signatures[1])).to.equal(false);
   });

  it("Can't Disable Signatures for strangers", async function () {
    const signatures = await accountability.getFunctionSignatures()
    const signaturesToDisable = [signatures[0], signatures[1]];
    const adminGroup = [1];
    // Check if are enabled yet
    expect(await accountability.connect(owner).getAccessibility(signatures[0])).to.equal(true);
    expect(await accountability.connect(owner).getAccessibility(signatures[1])).to.equal(true);
    await expect(accountability.connect(add1).disableListOfSignaturesForGroupUser(signaturesToDisable, adminGroup)).to.be.revertedWith("ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
 
  });

  it("Can Enable Signatures if DAO Creator", async function () {
    const signaturesToEnable = BYTES4DATA;
    const adminGroup = [1];
    // Check if are enabled yet
    expect(await accountability.connect(owner).getAccessibility(signaturesToEnable[0])).to.equal(false);
    expect(await accountability.connect(owner).getAccessibility(signaturesToEnable[1])).to.equal(false);
    await accountability.connect(owner).enableListOfSignaturesForGroupUser(signaturesToEnable, adminGroup);
    expect(await accountability.connect(owner).getAccessibility(signaturesToEnable[0])).to.equal(true);
    expect(await accountability.connect(owner).getAccessibility(signaturesToEnable[1])).to.equal(true);
  });

  it("Can't Enable Signatures if strangers", async function () {
    const signaturesToEnable = BYTES4DATA;
    const adminGroup = [1];
    // Check if are enabled yet
    expect(await accountability.connect(owner).getAccessibility(signaturesToEnable[0])).to.equal(false);
    expect(await accountability.connect(owner).getAccessibility(signaturesToEnable[1])).to.equal(false);
    await expect(accountability.connect(add1).enableListOfSignaturesForGroupUser(signaturesToEnable, adminGroup)).to.be.revertedWith("ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
  });

  it("Can Add Balance with accessibility", async function () {
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", tenThousoundsWithDecimals, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await accountability.connect(owner).addBalance(tokenAddress, add1.address, tenThousoundsWithDecimals);
    const changeBalanceEvents = await accountability.queryFilter(accountability.filters.ChangeBalanceEvent());
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.caller).to.equals(owner.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.token).to.equals(tokenAddress);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.oldBalance).to.equals(ethers.BigNumber.from("0"));
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.newBalance).to.equals(tenThousoundsWithDecimals);
    expect(await accountability.connect(owner).getBalance(tokenAddress, add1.address)).to.equals(tenThousoundsWithDecimals);
  });

  it("Can't Add Balance without accessibility", async function () {
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", tenThousoundsWithDecimals, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await expect(accountability.connect(add1).addBalance(tokenAddress, add1.address, tenThousoundsWithDecimals)).to.be.revertedWith("FUNCTION_NOT_ALLOWED_TO_RUN_FROM_THIS_SMARTCONTRACT");
  });

  it("Sub Balance with accessibility", async function () {
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    const fiveThousoundsWithDecimals = ethers.BigNumber.from("5000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", tenThousoundsWithDecimals, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await accountability.connect(owner).addBalance(tokenAddress, add1.address, tenThousoundsWithDecimals);
    await accountability.connect(owner).subBalance(tokenAddress, add1.address, fiveThousoundsWithDecimals);
    const changeBalanceEvents = await accountability.queryFilter(accountability.filters.ChangeBalanceEvent());
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.caller).to.equals(owner.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.token).to.equals(tokenAddress);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.oldBalance).to.equals(tenThousoundsWithDecimals);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.newBalance).to.equals(tenThousoundsWithDecimals.sub(fiveThousoundsWithDecimals));
    expect(await accountability.connect(owner).getBalance(tokenAddress, add1.address)).to.equals(tenThousoundsWithDecimals.sub(fiveThousoundsWithDecimals));
  });

  it("Can't Sub Balance without accessibility", async function () {
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    const fiveThousoundsWithDecimals = ethers.BigNumber.from("5000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", tenThousoundsWithDecimals, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await accountability.connect(owner).addBalance(tokenAddress, add1.address, tenThousoundsWithDecimals);
    await expect(accountability.connect(add1).subBalance(tokenAddress, add1.address, fiveThousoundsWithDecimals)).to.be.revertedWith("FUNCTION_NOT_ALLOWED_TO_RUN_FROM_THIS_SMARTCONTRACT");
  });

  it("Set User List Role with accessibility", async function () {
    const userGroupList = [2, 3];
    const userList = [add1.address, add2.address];
    await expect(accountability.connect(add1).setUserListRole(userList, userGroupList)).to.be.revertedWith("FUNCTION_NOT_ALLOWED_TO_RUN_FROM_THIS_SMARTCONTRACT");
  });

  it("Can't Set User List Role without accessibility", async function () {
    const userGroupList = [2, 3];
    const userList = [add1.address, add2.address];
    await accountability.connect(owner).setUserListRole(userList, userGroupList);
  });

  it("Create ERC20 Token with accessibility", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const billionWithDecimals = ethers.BigNumber.from("1000000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    const IERC20Upgradeable = await ethers.getContractAt("IERC20Upgradeable", tokenAddress);
    expect(await IERC20Upgradeable.balanceOf(accountability.address)).to.equals(billionWithDecimals);
  });

  it("Check if the new token is inside the DAO", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    expect(await accountability.isTokenPresentInsideTheDAO(tokenAddress)).to.equals(true);
  });


  it("Check if the a token not registered is not inside the DAO", async function () {
    expect(await accountability.isTokenPresentInsideTheDAO(ZERO_ADDRESS)).to.equals(false);
  });

  it("Can't Create ERC20 Token without accessibility", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const billionWithDecimals = ethers.BigNumber.from("1000000000000000000000000000");
    await expect(accountability.connect(add1).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add2.address)).to.be.revertedWith("FUNCTION_NOT_ALLOWED_TO_RUN_FROM_THIS_SMARTCONTRACT");
  });

  it("Can Mint ERC20 Token with correct referee and data", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const billionWithDecimals = ethers.BigNumber.from("1000000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await accountability.connect(add1).mintUpgradeableERC20Token(tokenAddress, billion);
    const IERC20Upgradeable = await ethers.getContractAt("IERC20Upgradeable", tokenAddress);
    expect(await IERC20Upgradeable.balanceOf(accountability.address)).to.equals(billionWithDecimals.add(billionWithDecimals));
    const IDynamicERC20Upgradeable = await ethers.getContractAt("IDynamicERC20Upgradeable", tokenAddress);
    expect(await IDynamicERC20Upgradeable.connect(accountability.address).getOwner()).to.equals(accountability.address);
  });

  it("Can't mint ERC20 Token with wrong referee", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await expect(accountability.connect(add2).mintUpgradeableERC20Token(tokenAddress, billion)).to.be.revertedWith("REFEREE_DISMATCH");
  });

  it("Can't mint ERC20 Token with 0 amount", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await expect(accountability.connect(add1).mintUpgradeableERC20Token(tokenAddress, ethers.BigNumber.from("0"))).to.be.revertedWith("INSUFFICIENT_AMOUNT");
  });

  it("Can't mint or burn ERC20 Token if the token itself is not created from the smart contract itself", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    const IDynamicERC20Upgradeable = await ethers.getContractAt("IDynamicERC20Upgradeable", tokenAddress);
    expect(await IDynamicERC20Upgradeable.connect(add1).getOwner()).to.equal(accountability.address);
  });

  it("Can burn ERC20 token with correct referee and data", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const billionWithDecimals = ethers.BigNumber.from("1000000000000000000000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await accountability.connect(add1).burnUpgradeableERC20Token(tokenAddress, tenThousoundsWithDecimals);
    const IERC20Upgradeable = await ethers.getContractAt("IERC20Upgradeable", tokenAddress);
    expect(await IERC20Upgradeable.balanceOf(accountability.address)).to.equals(billionWithDecimals.sub(tenThousoundsWithDecimals));
  });

  it("Can't burn ERC20 token with wrong referee", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await expect(accountability.connect(add2).burnUpgradeableERC20Token(tokenAddress, tenThousoundsWithDecimals)).to.be.revertedWith("REFEREE_DISMATCH");
  });

  it("Can't burn ERC20 token with 0 amount", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await expect(accountability.connect(add1).burnUpgradeableERC20Token(tokenAddress, ethers.BigNumber.from("0"))).to.be.revertedWith("INSUFFICIENT_AMOUNT");
  });

  it("Can burn ERC20 Token if the amount is greater than the token balance of the contract itself", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const billionWithDecimalsPlus1 = ethers.BigNumber.from("1000000000000000000000000001");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await expect(accountability.connect(add1).burnUpgradeableERC20Token(tokenAddress, billionWithDecimalsPlus1)).to.be.revertedWith("CANT_BURN_TOKENS_FOR_THIS_HIGH_AMOUNT");
  });

  it("Can approve ERC20 Token with the correct referee and data", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await accountability.connect(add1).approveERC20Distribution(tokenAddress, tenThousoundsWithDecimals);
    const IERC20Upgradeable = await ethers.getContractAt("IERC20Upgradeable", tokenAddress);
    expect(await IERC20Upgradeable.allowance(accountability.address, accountability.address)).to.equals(tenThousoundsWithDecimals);
  });

  it("Can't approve ERC20 Token if referee dismatch", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const billionWithDecimals = ethers.BigNumber.from("1000000000000000000000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await expect(accountability.connect(add2).approveERC20Distribution(tokenAddress, tenThousoundsWithDecimals)).to.be.revertedWith("REFEREE_DISMATCH");
  });

  it("Can't approve ERC20 Token if token is NULL", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    await expect(accountability.connect(add1).approveERC20Distribution(ZERO_ADDRESS, tenThousoundsWithDecimals)).to.be.revertedWith("CANT_REFER_TO_NULL_ADDRESS");
  });

  it("Can't approve ERC20 Token if amount is 0", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME", "TOKEN_SYM", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress = events[events.length-1].args.tokenUpgradeableAddress;
    await expect(accountability.connect(add1).approveERC20Distribution(tokenAddress, ethers.BigNumber.from("0"))).to.be.revertedWith("CANT_APPROVE_NULL_AMOUNT");
  });

  it("Redeem list of ERC20", async function () {
    // CREATE TOKENS
    const billion = ethers.BigNumber.from("1000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME1", "TOKEN_SYM1", billion, add1.address);
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME2", "TOKEN_SYM2", billion, add1.address);
    await accountability.connect(owner).createUpgradeableERC20Token("TOKEN_NAME2", "TOKEN_SYM3", billion, add1.address);
    const events = await accountability.queryFilter(accountability.filters.CreateERC20UpgradeableEvent());
    const tokenAddress1 =  events[events.length-3].args.tokenUpgradeableAddress;
    const tokenAddress2 =  events[events.length-2].args.tokenUpgradeableAddress;
    const tokenAddress3 =  events[events.length-1].args.tokenUpgradeableAddress;
    const tokenList = [tokenAddress1, tokenAddress2,  tokenAddress3];
    // ADD LOCAL BALANCE TO AN ADDRESS
    await accountability.connect(owner).addBalance(tokenAddress1, add1.address, tenThousoundsWithDecimals);
    await accountability.connect(owner).addBalance(tokenAddress2, add1.address, tenThousoundsWithDecimals);
    await accountability.connect(owner).addBalance(tokenAddress3, add1.address, tenThousoundsWithDecimals);
    // CHECK BALANCES OF TOKEN LIST
    expect(await accountability.getBalance(tokenAddress1, add1.address)).to.equals(tenThousoundsWithDecimals);
    expect(await accountability.getBalance(tokenAddress2, add1.address)).to.equals(tenThousoundsWithDecimals);
    expect(await accountability.getBalance(tokenAddress3, add1.address)).to.equals(tenThousoundsWithDecimals);
    // INCREASE ALLOWANCE
    await accountability.connect(add1).approveERC20Distribution(tokenAddress1, tenThousoundsWithDecimals);
    await accountability.connect(add1).approveERC20Distribution(tokenAddress2, tenThousoundsWithDecimals);
    await accountability.connect(add1).approveERC20Distribution(tokenAddress3, tenThousoundsWithDecimals);
    // REDEEM LIST OF TOKENS
    await accountability.connect(add1).redeemListOfERC20(tokenList);
    // CHECK EVENTS
    const changeBalanceEvents = await accountability.queryFilter(accountability.filters.ChangeBalanceEvent());
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.caller).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.token).to.equals(tokenAddress1);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.oldBalance).to.equals(tenThousoundsWithDecimals);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.newBalance).to.equals(ethers.BigNumber.from("0"));
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.caller).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.token).to.equals(tokenAddress2);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.oldBalance).to.equals(tenThousoundsWithDecimals);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.newBalance).to.equals(ethers.BigNumber.from("0"));
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.caller).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.token).to.equals(tokenAddress3);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.oldBalance).to.equals(tenThousoundsWithDecimals);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.newBalance).to.equals(ethers.BigNumber.from("0"));
    const redeemEvents = await accountability.queryFilter(accountability.filters.RedeemEvent());
    expect(redeemEvents[redeemEvents.length - 3].args.caller).to.equals(add1.address);
    expect(redeemEvents[redeemEvents.length - 3].args.token).to.equals(tokenAddress1);
    expect(redeemEvents[redeemEvents.length - 3].args.redeemAmount).to.equals(tenThousoundsWithDecimals);
    expect(redeemEvents[redeemEvents.length - 2].args.caller).to.equals(add1.address);
    expect(redeemEvents[redeemEvents.length - 2].args.token).to.equals(tokenAddress2);
    expect(redeemEvents[redeemEvents.length - 2].args.redeemAmount).to.equals(tenThousoundsWithDecimals);    
    expect(redeemEvents[redeemEvents.length - 1].args.caller).to.equals(add1.address);
    expect(redeemEvents[redeemEvents.length - 1].args.token).to.equals(tokenAddress3);
    expect(redeemEvents[redeemEvents.length - 1].args.redeemAmount).to.equals(tenThousoundsWithDecimals);
    // CHECK EACH TOKEN BALANCE FOR ADDRESS
    const IERC20Upgradeable1 = await ethers.getContractAt("IERC20Upgradeable", tokenAddress1);
    const IERC20Upgradeable2 = await ethers.getContractAt("IERC20Upgradeable", tokenAddress2);
    const IERC20Upgradeable3 = await ethers.getContractAt("IERC20Upgradeable", tokenAddress3);
    expect(await IERC20Upgradeable1.balanceOf(add1.address)).to.equals(tenThousoundsWithDecimals);
    expect(await IERC20Upgradeable2.balanceOf(add1.address)).to.equals(tenThousoundsWithDecimals);
    expect(await IERC20Upgradeable3.balanceOf(add1.address)).to.equals(tenThousoundsWithDecimals);
  });

});