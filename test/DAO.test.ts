const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { waffle, ethers } = require('hardhat');
const { web3 } = require('web3')
const Web3Utils = require('web3-utils');

const BYTES4DATA = [Web3Utils.toHex('A1B2'), Web3Utils.toHex('B2C3')];
const SECURITY_DELAY = 10;
const DECIMALS = 18;
const PERC_STACK_AWARD = 10;
const SIX_MONTHS_BLOCKS = 1048320;
const ONE_YEAR_BLOCKS = 2096640; 

const ONE_THOUSAND = "1000";
const RANDOM_NUMBER = "1234";
const FIVE_THOUSAND = "5000";
const TEN_THOUSAND = "10000";
const BILLION = "1000000000";
const EXT_DECIMALS = "000000000000000000";
const BN_ONE_THOUSAND = ethers.BigNumber.from(ONE_THOUSAND);;
const BN_RANDOM = ethers.BigNumber.from(RANDOM_NUMBER);;
const BN_FIVE_THOUSAND = ethers.BigNumber.from(FIVE_THOUSAND);;
const BN_TEN_THOUSAND = ethers.BigNumber.from(TEN_THOUSAND);
const BN_BILLION = ethers.BigNumber.from(BILLION);
const BN_ONE_THOUSAND_WITH_DEC = ethers.BigNumber.from(ONE_THOUSAND.concat(EXT_DECIMALS));
const BN_RANDOM_WITH_DEC = ethers.BigNumber.from(RANDOM_NUMBER.concat(EXT_DECIMALS));
const BN_FIVE_THOUSAND_WITH_DEC = ethers.BigNumber.from(FIVE_THOUSAND.concat(EXT_DECIMALS));
const BN_TEN_THOUSAND_WITH_DEC = ethers.BigNumber.from(TEN_THOUSAND.concat(EXT_DECIMALS));
const BN_BILLION_WITH_DEC = ethers.BigNumber.from(BILLION.concat(EXT_DECIMALS));
const BN_ZERO = ethers.BigNumber.from("0");
const BN_MAX = ethers.BigNumber.from("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const ERC20_ERC1155_RATIO = BN_TEN_THOUSAND;
const ERC1155_PDN_ID = 1;
const BN_LIMITS_123 = ethers.BigNumber.from("123");
const BN_LIMITS_456 = ethers.BigNumber.from("456");
const BN_LIMITS_789 = ethers.BigNumber.from("789");
const BN_LIMITS_123_WITH_DEC = ethers.BigNumber.from("123".concat(EXT_DECIMALS));
const BN_LIMITS_456_WITH_DEC = ethers.BigNumber.from("456".concat(EXT_DECIMALS));
const BN_LIMITS_789_WITH_DEC = ethers.BigNumber.from("789".concat(EXT_DECIMALS));
const ERC20_THrESHOLD_LIMITS = [BN_ONE_THOUSAND, BN_FIVE_THOUSAND];
const ERC20_THrESHOLD_VALUES = [BN_LIMITS_123, BN_LIMITS_456, BN_LIMITS_789]; // DIM(ERC20_THrESHOLD_VALUE) = DIM(ERC20_THrESHOLD_LIMIT) + 1
const ERC1155_THrESHOLD_LIMITS = [3, 7];
const ERC1155_THrESHOLD_VALUES = ERC20_THrESHOLD_VALUES; // DIM(ERC20_THrESHOLD_VALUE) = DIM(ERC20_THrESHOLD_LIMIT) + 1

enum pollTypeMetaData {
  NULL,
  CHANGE_CREATOR,
  DELETE_ADDRESS_ON_MULTISIG_LIST,
  ADD_ADDRESS_ON_MULTISIG_LIST,
  UNFREEZE
}

enum multiSigPollStruct {
  POLL_TYPE,
  POLLBLOCKSTART
  //HASVOTED,
  //VOTERECEIVED
}

enum vote {
  NULL,
  APPROVED,
  DECLINED
}

// ----------------------------------------------------------------------------------------------- SMART CONTRACT DEPLOYMENT

async function accessibilitySettingsDeploy() {
  const AccessibilitySettingsContractFactory = await ethers.getContractFactory("AccessibilitySettings");
  return await AccessibilitySettingsContractFactory.deploy();
}

async function multiSigDeploy() {
  const AccessibilitySettingsContractFactory = await ethers.getContractFactory("MultiSig");
  return await AccessibilitySettingsContractFactory.deploy();
}

async function dynamicERC20UpgradeableDeploy() {
  const DynamicERC20UpgradeableContractFactory = await ethers.getContractFactory("DynamicERC20Upgradeable");
  return await DynamicERC20UpgradeableContractFactory.deploy();BN_BILLION_WITH_DEC
}

async function accountabilityDeploy() {
  const AccountabilityContractFactory = await ethers.getContractFactory("Accountability");
  return await AccountabilityContractFactory.deploy();
}

// ----------------------------------------------------------------------------------------------- MULTISIG

describe("Unit Test: MultiSig", function () {
  let AccessibilitySettings;
  let MultiSig;
  let owner, add1, add2, add3, add4, add5, add6, add7, add8;
  let multiSigAddressList;

  beforeEach(async () => {
    [owner, add1, add2, add3, add4, add5, add6, add7, add8] = await ethers.getSigners();
    multiSigAddressList = [owner.address, add5.address, add6.address, add7.address, add8.address];
    AccessibilitySettings = await accessibilitySettingsDeploy();
    AccessibilitySettings.initialize();
    MultiSig = await multiSigDeploy();
    await MultiSig.initialize(AccessibilitySettings.address, multiSigAddressList);
  });

  it("createMultiSigPoll - Can't be run from stranger address", async function () {
    const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
    await expect(MultiSig.connect(add1).createMultiSigPoll(pollTypeID, add2.address)).to.be.revertedWith("NOT_ABLE_TO_CREATE_A_MULTISIG_POLL");

  });

  it("createMultiSigPoll - Can't set not valid ID", async function () {
    const pollTypeID = pollTypeMetaData.NULL;
    await expect(MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add2.address)).to.be.revertedWith("POLL_ID_DISMATCH");
  });

  it("createMultiSigPoll - Change Creator", async function () {
    const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add2.address);
    const events = await MultiSig.queryFilter(MultiSig.filters.NewMultisigPollEvent());
    const lastEvent = events[events.length - 1];
    const pollIndex = await MultiSig.indexPoll();
    expect(lastEvent.args.creator).to.equals(owner.address);
    expect(ethers.BigNumber.from(lastEvent.args.pollIndex)).to.equals(pollIndex);
    expect(lastEvent.args.pollType).to.equals(pollTypeID);
  });

  it("voteMultiSigPoll - Can't be run from stranger address", async function () {
    const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add2.address);
    const pollIndex = await MultiSig.indexPoll();
    await expect(MultiSig.connect(add1).voteMultiSigPoll(pollIndex, vote.APPROVED)).to.be.revertedWith("NOT_ABLE_TO_VOTE_FOR_A_MULTISIG_POLL");
  });

  it("voteMultiSigPoll - Can't vote two times for the same poll", async function () {
    const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add2.address);
    const pollIndex = await MultiSig.indexPoll();
    await MultiSig.connect(owner).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await expect(MultiSig.connect(owner).voteMultiSigPoll(pollIndex, vote.APPROVED)).to.be.revertedWith("ADDRESS_HAS_ALREADY_VOTED");
  });

  it("voteMultiSigPoll - Vote without actions (<3/5)", async function () {
    const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add2.address);
    const pollIndex = await MultiSig.indexPoll();
    await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, vote.APPROVED);
    const oldOwner = await AccessibilitySettings.getDAOCreator();
    const events = await MultiSig.queryFilter(MultiSig.filters.VoteMultisigPollEvent());
    const lastEvent = events[events.length - 1];
    expect(lastEvent.args.voter).to.equals(add5.address);
    expect(lastEvent.args.pollIndex).to.equals(pollIndex);
    expect(lastEvent.args.vote).to.equals(vote.APPROVED);
    const newOwner = await AccessibilitySettings.getDAOCreator();
    expect(newOwner).to.equals(oldOwner); // NO CHANGES
  });

  it("voteMultiSigPoll - Vote with actions (>=3/5) - change DAO creator", async function () {
    const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
    const oldOwner = await AccessibilitySettings.getDAOCreator();
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add2.address);
    const pollIndex = await MultiSig.indexPoll();
    await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, vote.APPROVED);
    const newOwner = await AccessibilitySettings.getDAOCreator();
    expect(newOwner).to.equals(add2.address); 
  });

  it("voteMultiSigPoll - Vote with actions (>=3/5) - Can't delete multisig if signature list lenght has minimum requirement", async function () {
    const pollTypeID = pollTypeMetaData.DELETE_ADDRESS_ON_MULTISIG_LIST;
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, owner.address);
    const pollIndex = await MultiSig.indexPoll();
    await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await expect(MultiSig.connect(add7).voteMultiSigPoll(pollIndex, vote.APPROVED)).to.be.revertedWith("NOT_ENOUGH_MULTISIG_ADDRESSES");
  });

  it("voteMultiSigPoll - Vote with actions (>=3/5) - Add new address on multisig", async function () {
    const pollTypeID = pollTypeMetaData.ADD_ADDRESS_ON_MULTISIG_LIST;
    const oldAddressIsInMultisig = await MultiSig.multiSigDAO(add2.address);
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add2.address);
    const pollIndex = await MultiSig.indexPoll();
    await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, vote.APPROVED);
    const newAddressIsInMultisig = await MultiSig.multiSigDAO(add2.address);
    expect(newAddressIsInMultisig).to.equals(!oldAddressIsInMultisig);
  });

  it("voteMultiSigPoll - Vote with actions (>=3/5) - Can't add new address on multisig if already present", async function () {
    const pollTypeID = pollTypeMetaData.ADD_ADDRESS_ON_MULTISIG_LIST;
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add5.address);
    const pollIndex = await MultiSig.indexPoll();
    await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await expect(MultiSig.connect(add7).voteMultiSigPoll(pollIndex, vote.APPROVED)).to.be.revertedWith("CANT_ADD_EXISTING_ADDRESS");

  });

  it("voteMultiSigPoll - Vote with actions - Delete address on multisig", async function () {
    let pollTypeID = pollTypeMetaData.ADD_ADDRESS_ON_MULTISIG_LIST;
    expect(await MultiSig.multiSigDAO(add2.address)).to.equals(false);
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add2.address);
    let pollIndex = await MultiSig.indexPoll();
    // Minimum: 3/5
    await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, vote.APPROVED);
    expect(await MultiSig.multiSigDAO(add2.address)).to.equals(true);
    pollTypeID = pollTypeMetaData.DELETE_ADDRESS_ON_MULTISIG_LIST;
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add2.address);
    pollIndex = await MultiSig.indexPoll();
    // Minimum 4/6
    await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add8).voteMultiSigPoll(pollIndex, vote.APPROVED);
    expect(await MultiSig.multiSigDAO(add2.address)).to.equals(false);
  });

  it("voteMultiSigPoll - Vote with actions - Can't delete address on multisig if not present", async function () {
    let pollTypeID = pollTypeMetaData.ADD_ADDRESS_ON_MULTISIG_LIST;
    expect(await MultiSig.multiSigDAO(add2.address)).to.equals(false);
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add2.address);
    let pollIndex = await MultiSig.indexPoll();
    // Minimum: 3/5
    await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, vote.APPROVED);
    expect(await MultiSig.multiSigDAO(add2.address)).to.equals(true);
    pollTypeID = pollTypeMetaData.DELETE_ADDRESS_ON_MULTISIG_LIST;
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add3.address);
    pollIndex = await MultiSig.indexPoll();
    // Minimum 4/6
    await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await expect(MultiSig.connect(add8).voteMultiSigPoll(pollIndex, vote.APPROVED)).to.be.revertedWith("CANT_DELETE_NOT_EXISTING_ADDRESS");
  });

  it("voteMultiSigPoll - Vote with actions - Can't delete address on multisig if minimum we don't have 5 addresses", async function () {
    const pollTypeID = pollTypeMetaData.DELETE_ADDRESS_ON_MULTISIG_LIST;
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, add5.address);
    const pollIndex = await MultiSig.indexPoll();
    await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await expect(MultiSig.connect(add8).voteMultiSigPoll(pollIndex, vote.APPROVED)).to.be.revertedWith("NOT_ENOUGH_MULTISIG_ADDRESSES");
  });

  it("voteMultiSigPoll - Vote with actions - Unfreeze", async function () {
    const pollTypeID = pollTypeMetaData.UNFREEZE;
    await MultiSig.connect(owner).createMultiSigPoll(pollTypeID, ZERO_ADDRESS);
    const pollIndex = await MultiSig.indexPoll();
    expect(await AccessibilitySettings.isFrozen()).to.equals(false);
    await AccessibilitySettings.connect(owner).freeze();
    expect(await AccessibilitySettings.isFrozen()).to.equals(true);
    await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, vote.APPROVED);
    await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, vote.APPROVED);
    expect(await AccessibilitySettings.isFrozen()).to.equals(false);
  });
});

// ----------------------------------------------------------------------------------------------- TOKEN CREATION


describe("Unit Test: Dynamic ERC20 Token", function () {
  let DynamicERC20Upgradeable, Accountability, AccessibilitySettings, MultiSig;
  let owner, add1, add2, add3, add4, add5, add6, add7, add8;
  let multiSigAddressList;

  beforeEach(async () => {
    [owner, add1, add2, add3, add4, add5, add6, add7, add8] = await ethers.getSigners();
    multiSigAddressList = [owner.address, add5.address, add6.address, add7.address, add8.address];
    AccessibilitySettings = await accessibilitySettingsDeploy();
    AccessibilitySettings.initialize();
    MultiSig = await multiSigDeploy();
    MultiSig.initialize(AccessibilitySettings.address, multiSigAddressList);
    Accountability = await accountabilityDeploy();
    Accountability.initialize(AccessibilitySettings.address, SECURITY_DELAY);
    DynamicERC20Upgradeable = await dynamicERC20UpgradeableDeploy();
    await DynamicERC20Upgradeable.connect(owner).initialize(Accountability.address, "TOKEN_NAME_1", "TOKEN_SYM_1", BN_BILLION, DECIMALS);
  });

  it("Dynamic ERC20 Upgradeable - Accountability Address on DERC20U match the smart contract accountability address", async function () {
    expect(await DynamicERC20Upgradeable.accountabilityAddress()).to.equals(Accountability.address);
  });

  it("Dynamic ERC20 Upgradeable - Init new token - Check Accountability Token Referee", async function () {
    expect(await Accountability.tokenReferreal(DynamicERC20Upgradeable.address)).to.equals(owner.address);
  });

  it("Dynamic ERC20 Upgradeable - A non init token has getLastBlockUserOp = 0", async function () {
    expect(await Accountability.getLastBlockUserOp(DynamicERC20Upgradeable.address, owner.address)).not.to.equals(ethers.BigNumber.from("0"));
  });

  it("Dynamic ERC20 Upgradeable - Init new token - getLastBlockUserOp has to be > 0", async function () {
    expect(await Accountability.getLastBlockUserOp(DynamicERC20Upgradeable.address, owner.address)).not.to.equals(ethers.BigNumber.from("0"));
  });

  it("Dynamic ERC20 Upgradeable - Can't init if not multisig", async function () {
    DynamicERC20Upgradeable = await dynamicERC20UpgradeableDeploy();
    await expect(DynamicERC20Upgradeable.connect(add1).initialize(Accountability.address, "TOKEN_NAME_1", "TOKEN_SYM_1", BN_BILLION, DECIMALS)).to.be.revertedWith("REQUIRE_MULTISIG");
  });
});

// ----------------------------------------------------------------------------------------------- ACCESSIBILITY SETTINGS

describe("Unit Test: Accessibility Settings", function () {
  let accessibilitySettings
  let owner, add1, add2, add3, add4, add5, add6, add7, add8, add9;
  let multiSigAddressList;

  beforeEach(async () => {
    // Get Test Addresses
    [owner, add1, add2, add3, add4, add5, add6, add7, add8, add9] = await ethers.getSigners();
    multiSigAddressList = [owner.address, add5.address, add6.address, add7.address, add8.address];
    accessibilitySettings = await accessibilitySettingsDeploy();
    accessibilitySettings.initialize();
  });

  it("Can't initialize two times the same smart contract", async function () {
    await expect(accessibilitySettings.connect(owner).initialize()).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("Enable signatures", async function () {
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
    const groupIndexList = [2, 3];
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
    await accessibilitySettings.connect(add1).setUserListRole([add2.address], [groupIndex]);
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

});


describe("Unit Test: Accountability", function () {

  let accessibilitySettings, multiSig, accountability, dynamicERC20Upgradeable;
  let owner, add1, add2, add3, add4, add5, add6, add7, add8;
  let multiSigAddressList;

  beforeEach(async () => {
    [owner, add1, add2, add3, add4, add5, add6, add7, add8] = await ethers.getSigners();
    multiSigAddressList = [owner.address, add5.address, add6.address, add7.address, add8.address];
    accessibilitySettings = await accessibilitySettingsDeploy();                                // Smart Contracts has to be
    accessibilitySettings.initialize();
    multiSig = await multiSigDeploy();        // executed in this orderMultiSig
    multiSig.initialize(accessibilitySettings.address, multiSigAddressList);
    accountability = await accountabilityDeploy();                 // to run properly all variables
    accountability.initialize(accessibilitySettings.address, SECURITY_DELAY);
    dynamicERC20Upgradeable = await dynamicERC20UpgradeableDeploy();      // inside of them
    await dynamicERC20Upgradeable.initialize(accountability.address, "TOKEN_NAME_1", "TOKEN_SYM_1", BN_BILLION, DECIMALS);
  });

  it("Check if after depoly DAO Creator is in Admin User Group", async function () {
    expect(await accessibilitySettings.connect(accountability.address).getUserGroup(owner.address)).to.equal(1);
  });

  it("Check if after deploy the smart contract itself is in Admin User Group", async function () {
    expect(await accessibilitySettings.connect(accountability.address).getUserGroup(accountability.address)).to.equal(1);
  });

  it("Check if after deploy accessibilitySettings has enabled signatures for admin group", async function () {
    const events = await accessibilitySettings.queryFilter(accessibilitySettings.filters.ChangeGroupAccessibilityEvent());
    let signatures = Array();
    events.forEach(event => {
      if (event.args.smartContractReference == accountability.address && event.args.Accessibility == true) {
        if (signatures.indexOf(event.args.functionSignature) === -1) {
          signatures.push(event.args.functionSignature);
        }
      }
    });
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[0], owner.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[1], owner.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[2], owner.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[3], owner.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[0], accountability.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[1], accountability.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[2], accountability.address)).to.equals(true);
    expect(await accessibilitySettings.connect(accountability.address).getAccessibility(signatures[3], accountability.address)).to.equals(true);
  });

  it("Can Disable Signatures if DAO Creator", async function () {
    const events = await accessibilitySettings.queryFilter(accessibilitySettings.filters.ChangeGroupAccessibilityEvent());
    let signatures = Array();
    events.forEach(event => {
      if (event.args.smartContractReference == accountability.address && event.args.Accessibility == true) {
        if (signatures.indexOf(event.args.functionSignature) === -1) {
          signatures.push(event.args.functionSignature);
        }
      }
    });
    const signaturesToEnable = [signatures[0], signatures[1]];
    const signaturesToDisable = [signatures[0]];
    const adminGroup = [1];
    const otherGroup = [2];
    // Check if are enabled yet
    await accountability.connect(owner).enableListOfSignaturesForGroupUser(signaturesToEnable, otherGroup);
    await accountability.setUserListRole([add1.address], otherGroup);
    expect(await accountability.connect(add1).getAccessibility(signatures[0])).to.equal(true);
    expect(await accountability.connect(add1).getAccessibility(signatures[1])).to.equal(true);
    await accountability.connect(owner).disableListOfSignaturesForGroupUser(signaturesToDisable, otherGroup);
    expect(await accountability.connect(add1).getAccessibility(signatures[0])).to.equal(false);
    expect(await accountability.connect(add1).getAccessibility(signatures[1])).to.equal(true);
  });

  it("Can't Disable Signatures for strangers", async function () {
    const events = await accessibilitySettings.queryFilter(accessibilitySettings.filters.ChangeGroupAccessibilityEvent());
    let signatures = Array();
    events.forEach(event => {
      if (event.args.smartContractReference == accountability.address && event.args.Accessibility == true) {
        if (signatures.indexOf(event.args.functionSignature) === -1) {
          signatures.push(event.args.functionSignature);
        }
      }
    });
    const signaturesToDisable = [signatures[0], signatures[1]];
    const adminGroup = [1];
    await expect(accountability.connect(add1).disableListOfSignaturesForGroupUser(signaturesToDisable, adminGroup)).to.be.revertedWith("LIMITED_FUNCTION_FOR_DAO_CREATOR");
  });

  it("Can't Disable Admin Functions", async function () {
    const events = await accessibilitySettings.queryFilter(accessibilitySettings.filters.ChangeGroupAccessibilityEvent());
    let signatures = Array();
    events.forEach(event => {
      if (event.args.smartContractReference == accountability.address && event.args.Accessibility == true) {
        if (signatures.indexOf(event.args.functionSignature) === -1) {
          signatures.push(event.args.functionSignature);
        }
      }
    });
    const signaturesToDisable = [signatures[0], signatures[1]];
    const adminGroup = [1];
    await expect(accountability.connect(owner).disableListOfSignaturesForGroupUser(signaturesToDisable, adminGroup)).to.be.revertedWith("CANNOT_DISABLE_ADMIN_FUNCTIONS");
  });

  it("Can Enable Signatures if DAO Creator", async function () {
    const events = await accessibilitySettings.queryFilter(accessibilitySettings.filters.ChangeGroupAccessibilityEvent());
    let signatures = Array();
    events.forEach(event => {
      if (event.args.smartContractReference == accountability.address && event.args.Accessibility == true) {
        if (signatures.indexOf(event.args.functionSignature) === -1) {
          signatures.push(event.args.functionSignature);
        }
      }
    });
    const signaturesToEnable = [signatures[0]];
    const otherGroup = [2];
    expect(await accountability.connect(add1).getAccessibility(signaturesToEnable[0])).to.equal(false);
    await accountability.connect(owner).enableListOfSignaturesForGroupUser(signaturesToEnable, otherGroup);
    expect(await accountability.connect(owner).getAccessibility(signaturesToEnable[0])).to.equal(true);
  });

  it("Can't Enable Signatures if strangers", async function () {
    const signaturesToEnable = BYTES4DATA;
    const adminGroup = [1];
    // Check if are enabled yet
    expect(await accountability.connect(owner).getAccessibility(signaturesToEnable[0])).to.equal(false);
    expect(await accountability.connect(owner).getAccessibility(signaturesToEnable[1])).to.equal(false);
    await expect(accountability.connect(add1).enableListOfSignaturesForGroupUser(signaturesToEnable, adminGroup)).to.be.revertedWith("LIMITED_FUNCTION_FOR_DAO_CREATOR");
  });

  it("Can Add Balance with accessibility", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).addBalance(tokenAddress, add1.address, BN_TEN_THOUSAND_WITH_DEC);
    const changeBalanceEvents = await accountability.queryFilter(accountability.filters.ChangeBalanceEvent());
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.caller).to.equals(owner.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.token).to.equals(tokenAddress);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.oldBalance).to.equals(ethers.BigNumber.from("0"));
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.newBalance).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    expect(await accountability.connect(owner).getBalance(tokenAddress, add1.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC);
  });

  it("Can't Add Balance without accessibility", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    await expect(accountability.connect(add1).addBalance(tokenAddress, add1.address, BN_TEN_THOUSAND_WITH_DEC)).to.be.revertedWith("ACCESS_DENIED");
  });

  it("Sub Balance with accessibility", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).addBalance(tokenAddress, add1.address, BN_TEN_THOUSAND_WITH_DEC);
    await accountability.connect(owner).subBalance(tokenAddress, add1.address, BN_FIVE_THOUSAND_WITH_DEC);
    const changeBalanceEvents = await accountability.queryFilter(accountability.filters.ChangeBalanceEvent());
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.caller).to.equals(owner.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.token).to.equals(tokenAddress);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.oldBalance).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.newBalance).to.equals(BN_TEN_THOUSAND_WITH_DEC.sub(BN_FIVE_THOUSAND_WITH_DEC));
    expect(await accountability.connect(owner).getBalance(tokenAddress, add1.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC.sub(BN_FIVE_THOUSAND_WITH_DEC));
  });

  it("Can't Sub Balance without accessibility", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).addBalance(tokenAddress, add1.address, BN_TEN_THOUSAND_WITH_DEC);
    await expect(accountability.connect(add1).subBalance(tokenAddress, add1.address, BN_FIVE_THOUSAND_WITH_DEC)).to.be.revertedWith("ACCESS_DENIED");
  });

  it("Set User List Role with accessibility", async function () {
    const userGroupList = [2, 3];
    const userList = [add1.address, add2.address];
    await expect(accountability.connect(add1).setUserListRole(userList, userGroupList)).to.be.revertedWith("ACCESS_DENIED");
  });

  it("Can't Set User List Role without accessibility", async function () {
    const userGroupList = [2, 3];
    const userList = [add1.address, add2.address];
    await accountability.connect(owner).setUserListRole(userList, userGroupList);
  });

  it("Can burn ERC20 token with correct referee and data", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    const IERC20Upgradeable = await ethers.getContractAt("IERC20Upgradeable", tokenAddress);
    for (let index = 0; index < SECURITY_DELAY; index++) { await ethers.provider.send("evm_mine"); }
    await accountability.connect(owner).burnUpgradeableERC20Token(tokenAddress, BN_TEN_THOUSAND);
    expect(await IERC20Upgradeable.balanceOf(accountability.address)).to.equals(BN_BILLION_WITH_DEC.sub(BN_TEN_THOUSAND_WITH_DEC));
  });

  it("Can't burn ERC20 token with correct referee and data if security dismatch", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    for (let index = 0; index < SECURITY_DELAY; index++) { await ethers.provider.send("evm_mine"); }
    await expect(accountability.connect(owner).burnUpgradeableERC20Token(tokenAddress, BN_BILLION)).to.be.revertedWith("SECURITY_DISMATCH");
  });


  it("Can't burn ERC20 token with wrong referee", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).setUserListRole([add1.address], [1]); // add1 can run burnUpgradeableERC20Token
    for (let index = 0; index < SECURITY_DELAY; index++) { await ethers.provider.send("evm_mine"); }
    await expect(accountability.connect(add1).burnUpgradeableERC20Token(tokenAddress, BN_TEN_THOUSAND)).to.be.revertedWith("REFEREE_DISMATCH");
  });

  it("Can't burn ERC20 token with 0 amount", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    for (let index = 0; index < SECURITY_DELAY; index++) { await ethers.provider.send("evm_mine"); }
    await expect(accountability.connect(owner).burnUpgradeableERC20Token(tokenAddress, BN_ZERO)).to.be.revertedWith("INSUFFICIENT_AMOUNT");
  });

  it("Can approve ERC20 Token with the correct referee and data directly from IERC20U", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    for (let index = 0; index < SECURITY_DELAY; index++) { await ethers.provider.send("evm_mine"); }
    await accountability.connect(owner).approveERC20Distribution(tokenAddress, BN_TEN_THOUSAND); // approve and burn yes
    const IERC20Upgradeable = await ethers.getContractAt("IERC20Upgradeable", tokenAddress);
    expect(await IERC20Upgradeable.allowance(accountability.address, accountability.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC);
  });

  it("Can't approve ERC20 Token if referee dismatch", async function () {
    ;
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).setUserListRole([add1.address], [1]); // add1 can run approveERC20Distribution
    for (let index = 0; index < SECURITY_DELAY; index++) { await ethers.provider.send("evm_mine"); }
    await expect(accountability.connect(add1).approveERC20Distribution(tokenAddress, BN_TEN_THOUSAND)).to.be.revertedWith("REFEREE_DISMATCH");
  });

  it("Can't approve ERC20 Token if token is NULL", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).setUserListRole([add1.address], [1]); // add1 can run approveERC20Distribution
    for (let index = 0; index < SECURITY_DELAY; index++) { await ethers.provider.send("evm_mine"); }
    await expect(accountability.connect(add1).approveERC20Distribution(ZERO_ADDRESS, BN_TEN_THOUSAND)).to.be.revertedWith("NULL_ADD_NOT_ALLOWED");
  });

  it("Can't approve ERC20 Token if amount is 0", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).setUserListRole([add1.address], [1]); // add1 can run approveERC20Distribution
    for (let index = 0; index < SECURITY_DELAY; index++) { await ethers.provider.send("evm_mine"); }
    await expect(accountability.connect(add1).approveERC20Distribution(tokenAddress, BN_ZERO)).to.be.revertedWith("NULL_AMOUNT_NOT_ALLOWED");
  });

  it("Redeem list of ERC20", async function () {
    // CREATE TOKENS
    const dynamicERC20Upgradeable2 = await dynamicERC20UpgradeableDeploy();      // inside of them
    const dynamicERC20Upgradeable3 = await dynamicERC20UpgradeableDeploy();      // inside of them
    await dynamicERC20Upgradeable2.initialize(accountability.address, "TOKEN_NAME_2", "TOKEN_SYM_2", BN_BILLION, DECIMALS);
    await dynamicERC20Upgradeable3.initialize(accountability.address, "TOKEN_NAME_3", "TOKEN_SYM_3", BN_BILLION, DECIMALS);
    const tokenList = [dynamicERC20Upgradeable.address, dynamicERC20Upgradeable2.address, dynamicERC20Upgradeable3.address];
    // ADD LOCAL BALANCE TO AN ADDRESS
    await accountability.connect(owner).addBalance(tokenList[0], add1.address, BN_TEN_THOUSAND_WITH_DEC);
    await accountability.connect(owner).addBalance(tokenList[1], add1.address, BN_TEN_THOUSAND_WITH_DEC);
    await accountability.connect(owner).addBalance(tokenList[2], add1.address, BN_TEN_THOUSAND_WITH_DEC);
    // CHECK BALANCES OF TOKEN LIST
    expect(await accountability.getBalance(tokenList[0], add1.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    expect(await accountability.getBalance(tokenList[1], add1.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    expect(await accountability.getBalance(tokenList[2], add1.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    // INCREASE ALLOWANCE
    for (let index = 0; index < SECURITY_DELAY; index++) { await ethers.provider.send("evm_mine"); }
    await accountability.connect(owner).approveERC20Distribution(tokenList[0], BN_TEN_THOUSAND);
    await accountability.connect(owner).approveERC20Distribution(tokenList[1], BN_TEN_THOUSAND);
    await accountability.connect(owner).approveERC20Distribution(tokenList[2], BN_TEN_THOUSAND);
    // REDEEM LIST OF TOKENS
    await accountability.connect(add1).redeemListOfERC20(tokenList);
    // CHECK EVENTS
    const changeBalanceEvents = await accountability.queryFilter(accountability.filters.ChangeBalanceEvent());
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.caller).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.token).to.equals(tokenList[0]);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.oldBalance).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.newBalance).to.equals(BN_ZERO);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.caller).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.token).to.equals(tokenList[1]);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.oldBalance).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.newBalance).to.equals(BN_ZERO);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.caller).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.token).to.equals(tokenList[2]);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.oldBalance).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.newBalance).to.equals(BN_ZERO);
    const redeemEvents = await accountability.queryFilter(accountability.filters.RedeemEvent());
    expect(redeemEvents[redeemEvents.length - 3].args.caller).to.equals(add1.address);
    expect(redeemEvents[redeemEvents.length - 3].args.token).to.equals(tokenList[0]);
    expect(redeemEvents[redeemEvents.length - 3].args.redeemAmount).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    expect(redeemEvents[redeemEvents.length - 2].args.caller).to.equals(add1.address);
    expect(redeemEvents[redeemEvents.length - 2].args.token).to.equals(tokenList[1]);
    expect(redeemEvents[redeemEvents.length - 2].args.redeemAmount).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    expect(redeemEvents[redeemEvents.length - 1].args.caller).to.equals(add1.address);
    expect(redeemEvents[redeemEvents.length - 1].args.token).to.equals(tokenList[2]);
    expect(redeemEvents[redeemEvents.length - 1].args.redeemAmount).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    // CHECK EACH TOKEN BALANCE FOR ADDRESS
    const IERC20Upgradeable1 = await ethers.getContractAt("IERC20Upgradeable", tokenList[0]);
    const IERC20Upgradeable2 = await ethers.getContractAt("IERC20Upgradeable", tokenList[1]);
    const IERC20Upgradeable3 = await ethers.getContractAt("IERC20Upgradeable", tokenList[2]);
    expect(await IERC20Upgradeable1.balanceOf(add1.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    expect(await IERC20Upgradeable2.balanceOf(add1.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC);
    expect(await IERC20Upgradeable3.balanceOf(add1.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC);
  });

  it("Revert in case all tokens to redeem have amount null", async function () {
    // CREATE TOKENS
    const dynamicERC20Upgradeable2 = await dynamicERC20UpgradeableDeploy();      // inside of them
    const dynamicERC20Upgradeable3 = await dynamicERC20UpgradeableDeploy();      // inside of them
    await dynamicERC20Upgradeable2.initialize(accountability.address, "TOKEN_NAME_2", "TOKEN_SYM_2", BN_BILLION, DECIMALS);
    await dynamicERC20Upgradeable3.initialize(accountability.address, "TOKEN_NAME_3", "TOKEN_SYM_3", BN_BILLION, DECIMALS);
    const tokenList = [dynamicERC20Upgradeable.address, dynamicERC20Upgradeable2.address, dynamicERC20Upgradeable3.address];
    for (let index = 0; index < SECURITY_DELAY; index++) { await ethers.provider.send("evm_mine"); }
    await expect(accountability.connect(add1).redeemListOfERC20(tokenList)).to.be.revertedWith("NO_TOKENS");
  });

  // --do all negative tests for redeem
});

// ----------------------------------------------------------------------------------------------- SMART CONTRACT DEPLOYMENT

async function ERC20_PDN_Deploy() {
  const ERC20_PND_ContractFactory = await ethers.getContractFactory("ERC20_PDN");
  return await ERC20_PND_ContractFactory.deploy();
}

async function ERC1155_PDN_Deploy() {
  const ERC1155_PND_ContractFactory = await ethers.getContractFactory("ERC1155_PDN");
  return await ERC1155_PND_ContractFactory.deploy();
}

// ----------------------------------------------------------------------------------------------- 

describe("ERC20-ERC1155 Hybrid system", function () {
  let ERC20_PDN;
  let ERC1155_PDN;
  let IERC20_PDN;
  let IERC1155_PDN;
  let owner, add1, add2, add3, add4, add5, add6, add7;

  beforeEach(async () => {
    let URI = "#";
    [owner, add1, add2, add3, add4, add5, add6, add7] = await ethers.getSigners();    
    ERC20_PDN = await ERC20_PDN_Deploy();
    ERC1155_PDN = await ERC1155_PDN_Deploy();
    await ERC20_PDN.connect(owner).initialize("Poseidon Token", "PDN", BN_BILLION, DECIMALS);
    await ERC1155_PDN.connect(owner).initialize(URI, ERC20_PDN.address);
    IERC20_PDN = await ethers.getContractAt("IERC20Upgradeable", ERC20_PDN.address);
    IERC1155_PDN = await ethers.getContractAt("IERC1155Upgradeable", ERC1155_PDN.address);
  });

  it("Check PDN token initialization", async function () {
    expect(await IERC20_PDN.balanceOf(owner.address)).to.equals(BN_BILLION_WITH_DEC);
    expect(await IERC20_PDN.totalSupply()).to.equals(BN_BILLION_WITH_DEC);
  });

  it("Airdrop", async function () {
    const airdropAddressList = [add1.address, add2.address, add3.address];
    const amountList = [ONE_THOUSAND, FIVE_THOUSAND, TEN_THOUSAND];
    await ERC20_PDN.runAirdrop(airdropAddressList, amountList, DECIMALS);
    expect(await IERC20_PDN.balanceOf(add1.address)).to.equals(BN_ONE_THOUSAND_WITH_DEC);
    expect(await IERC20_PDN.balanceOf(add2.address)).to.equals(BN_FIVE_THOUSAND_WITH_DEC);
    expect(await IERC20_PDN.balanceOf(add3.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC);
  });

  it("Stranger can't run Airdrop", async function () {
    const airdropAddressList = [add1.address, add2.address, add3.address];
    const amountList = [ONE_THOUSAND, FIVE_THOUSAND, TEN_THOUSAND];
    await expect(ERC20_PDN.connect(add1).runAirdrop(airdropAddressList, amountList, DECIMALS)).to.be.revertedWith("ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
  });

  it("Can't run Airdrop if data dimension dismatch", async function () {
    const airdropAddressList = [add1.address, add2.address, add3.address];
    const amountList = [ONE_THOUSAND, FIVE_THOUSAND];
    await expect(ERC20_PDN.runAirdrop(airdropAddressList, amountList, DECIMALS)).to.be.revertedWith("DATA_DIMENSION_DISMATCH");
  });

  it("Can't run airdrop if amount is zero", async function () {
    const airdropAddressList = [add1.address, add2.address, add3.address];
    const amountList = [ONE_THOUSAND, FIVE_THOUSAND, 0];
    await expect(ERC20_PDN.runAirdrop(airdropAddressList, amountList, DECIMALS)).to.be.revertedWith("CANT_SET_NULL_VALUES");
  });

  it("Can't run airdrop if address is null", async function () {
    const airdropAddressList = [add1.address, add2.address, ZERO_ADDRESS];
    const amountList = [ONE_THOUSAND, FIVE_THOUSAND, TEN_THOUSAND];
    await expect(ERC20_PDN.runAirdrop(airdropAddressList, amountList, DECIMALS)).to.be.revertedWith("CANT_SET_NULL_VALUES");
  });

  it("Burn token", async function () {
    const airdropAddressList = [add1.address];
    const amountList = [FIVE_THOUSAND];
    await ERC20_PDN.runAirdrop(airdropAddressList, amountList, DECIMALS);
    expect(await IERC20_PDN.balanceOf(add1.address)).to.equals(BN_FIVE_THOUSAND_WITH_DEC);
    await ERC20_PDN.connect(add1).burn(BN_ONE_THOUSAND_WITH_DEC);
    expect(await IERC20_PDN.balanceOf(add1.address)).to.equals(BN_FIVE_THOUSAND_WITH_DEC.sub(BN_ONE_THOUSAND_WITH_DEC));
  });

  it("Set ERC1155 - ERC20 Connection", async function () {
    await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, ERC20_ERC1155_RATIO);
    expect(await ERC20_PDN.ERC1155Address()).to.equals(ERC1155_PDN.address);
    expect(await ERC20_PDN.ID_ERC1155()).to.equals(ERC1155_PDN_ID);
    expect(await ERC20_PDN.ratio()).to.equals(ERC20_ERC1155_RATIO);
  });

  it("Stranger can't set ERC1155 - ERC20 Connection", async function () {
    await expect(ERC20_PDN.connect(add1).setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, ERC20_ERC1155_RATIO)).to.be.revertedWith("ONLY_ADMIN_CAN_RUN_THIS_FUNCTION");
  });

  it("Can't set ERC1155 - ERC20 Connection with Null ERC1155 Address", async function () {
    await expect(ERC20_PDN.setERC1155(ZERO_ADDRESS, ERC1155_PDN_ID, ERC20_ERC1155_RATIO)).to.be.revertedWith("ADDRESS_CANT_BE_NULL");
  });

  it("Can't set ERC1155 - ERC20 Connection with 0 ID", async function () {
    await expect(ERC20_PDN.setERC1155(ERC1155_PDN.address, BN_ZERO, ERC20_ERC1155_RATIO)).to.be.revertedWith("ID_CANT_BE_ZERO");
  });

  it("Can't set ERC1155 - ERC20 Connection with 0 ratio", async function () {
    await expect(ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, BN_ZERO)).to.be.revertedWith("RATIO_CANT_BE_ZERO");
  });

  it("Burn ERC20 and receive ERC1155 NFT with exact amount ratio", async function () {
    const airdropAddressList = [add1.address];
    const amountList = [BN_TEN_THOUSAND];
    await ERC20_PDN.runAirdrop(airdropAddressList, amountList, DECIMALS);
    const RATIO = BN_ONE_THOUSAND;
    await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
    await ERC20_PDN.connect(add1).burnAndReceiveNFT(BN_FIVE_THOUSAND);
    expect(await IERC20_PDN.balanceOf(add1.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC.sub(BN_FIVE_THOUSAND_WITH_DEC));
    expect(await IERC1155_PDN.balanceOf(add1.address, ERC1155_PDN_ID)).to.equals(BN_FIVE_THOUSAND.div(RATIO));
  });

  it("Burn ERC20 and receive ERC1155 NFT with different amount from ratio", async function () {
    const airdropAddressList = [add1.address];
    const amountList = [BN_TEN_THOUSAND];
    await ERC20_PDN.runAirdrop(airdropAddressList, amountList, DECIMALS);
    const RATIO = BN_ONE_THOUSAND;
    await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
    await ERC20_PDN.connect(add1).burnAndReceiveNFT(BN_RANDOM);
    expect(await IERC20_PDN.balanceOf(add1.address)).to.equals(BN_TEN_THOUSAND_WITH_DEC.sub(BN_ONE_THOUSAND_WITH_DEC));
    expect(await IERC1155_PDN.balanceOf(add1.address, ERC1155_PDN_ID)).to.equals(BN_ONE_THOUSAND.div(RATIO));
  });

  it("Can't burn ERC20 and receive ERC1155 NFT if ERC1155 is not set", async function () {
    await expect(ERC20_PDN.connect(add1).burnAndReceiveNFT(BN_RANDOM)).to.be.revertedWith("ERC1155_ADDRESS_NOT_SET");
  });

  it("Can't burn ERC20 and receive ERC1155 NFT if the amount is less than 1 ratio", async function () {
    const airdropAddressList = [add1.address];
    const amountList = [BN_TEN_THOUSAND];
    await ERC20_PDN.runAirdrop(airdropAddressList, amountList, DECIMALS);
    const RATIO = BN_FIVE_THOUSAND;
    await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
    await expect(ERC20_PDN.connect(add1).burnAndReceiveNFT(BN_RANDOM)).to.be.revertedWith("NOT_ENOUGH_TOKEN_TO_RECEIVE_NFT");
  });

  it("Can't burn ERC20 and receive ERC1155 NFT if the balance is not enough to cover the amount", async function () {
    const airdropAddressList = [add1.address];
    const amountList = [BN_FIVE_THOUSAND];
    await ERC20_PDN.runAirdrop(airdropAddressList, amountList, DECIMALS);
    const RATIO = BN_FIVE_THOUSAND;
    await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
    await expect(ERC20_PDN.connect(add1).burnAndReceiveNFT(BN_TEN_THOUSAND)).to.be.revertedWith("ERC20: burn amount exceeds balance");
  });

    // ERC1155 OVERRIDE

    
    it("Override safeTransformFrom function of ERC1155 - function not allowed", async function () {
      const ADDRESSES = [add1.address, add2.address, add3.address];
      const AMOUNTS = [BN_ONE_THOUSAND, BN_FIVE_THOUSAND, BN_TEN_THOUSAND.mul(2)];
      const RATIO = BN_ONE_THOUSAND;
      await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
      await ERC20_PDN.runAirdrop(ADDRESSES, AMOUNTS, DECIMALS);
      await ERC20_PDN.connect(add1).burnAndReceiveNFT(BN_ONE_THOUSAND); 
      await ERC20_PDN.connect(add2).burnAndReceiveNFT(BN_ONE_THOUSAND); 
      await ERC20_PDN.connect(add3).burnAndReceiveNFT(BN_FIVE_THOUSAND);
      await expect(ERC1155_PDN.connect(add1).safeTransferFrom(add1.address, add2.address, ERC1155_PDN_ID, 1, BYTES4DATA[0])).to.be.revertedWith("FUNCTION_OVERRIDE_TRANSFER_NOT_ALLOWED");
    });

    it("Override safeBatchTransferFrom function of ERC1155 - function not allowed", async function () {
      const ADDRESSES = [add1.address, add2.address, add3.address];
      const AMOUNTS = [BN_ONE_THOUSAND, BN_FIVE_THOUSAND, BN_TEN_THOUSAND.mul(2)];
      const RATIO = BN_ONE_THOUSAND;
      await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
      await ERC20_PDN.runAirdrop(ADDRESSES, AMOUNTS, DECIMALS);
      await ERC20_PDN.connect(add1).burnAndReceiveNFT(BN_ONE_THOUSAND); 
      await ERC20_PDN.connect(add2).burnAndReceiveNFT(BN_ONE_THOUSAND); 
      await ERC20_PDN.connect(add3).burnAndReceiveNFT(BN_FIVE_THOUSAND);
      await expect(ERC1155_PDN.connect(add1).safeBatchTransferFrom(add1.address, add2.address, [ERC1155_PDN_ID], [1], BYTES4DATA[0])).to.be.revertedWith("FUNCTION_OVERRIDE_TRANSFER_BATCH_NOT_ALLOWED");
    });

    // Vesting test

    it("Add Vest", async function () {
      const RATIO = BN_ONE_THOUSAND;
      await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
      const tx = await ERC20_PDN.connect(owner).addVest(add1.address, BN_ONE_THOUSAND_WITH_DEC, SIX_MONTHS_BLOCKS);
      const vestMetaData = await ERC20_PDN.getVestMetaData(add1.address);
      await expect(vestMetaData[0]).to.equals(BN_ONE_THOUSAND_WITH_DEC);
      await expect(vestMetaData[1]).to.equals(ethers.BigNumber.from(tx.blockNumber).add(SIX_MONTHS_BLOCKS));
      expect (await ERC20_PDN.ownerLock()).to.equals(ethers.BigNumber.from(BN_ONE_THOUSAND_WITH_DEC));
    });

    it("Owner lock amount is the sum of single vests", async function () {
      const RATIO = BN_ONE_THOUSAND;
      await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
      await ERC20_PDN.connect(owner).addVest(add1.address, BN_ONE_THOUSAND_WITH_DEC, SIX_MONTHS_BLOCKS);
      await ERC20_PDN.connect(owner).addVest(add2.address, BN_ONE_THOUSAND_WITH_DEC, SIX_MONTHS_BLOCKS);
      expect (await ERC20_PDN.ownerLock()).to.equals(ethers.BigNumber.from(BN_ONE_THOUSAND_WITH_DEC).mul(2));
    });

    it("Owner lock amount is restored after withdraw", async function () {
      const RATIO = BN_ONE_THOUSAND;
      const DURATION = 5;
      await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
      await ERC20_PDN.connect(owner).addVest(add1.address, BN_ONE_THOUSAND_WITH_DEC, DURATION);
      await ERC20_PDN.connect(owner).addVest(add2.address, BN_ONE_THOUSAND_WITH_DEC, DURATION);
      for (let index = 0; index < DURATION; index++) { await ethers.provider.send("evm_mine"); }
      await ERC20_PDN.connect(add1).withdrawVest();
      expect (await ERC20_PDN.ownerLock()).to.equals(ethers.BigNumber.from(BN_ONE_THOUSAND_WITH_DEC));
      await ERC20_PDN.connect(add2).withdrawVest();
      expect (await ERC20_PDN.ownerLock()).to.equals(ethers.BigNumber.from(0));
    });

    it("Can't Add Vest if it is already set", async function () {
      const RATIO = BN_ONE_THOUSAND;
      await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
      await ERC20_PDN.connect(owner).addVest(add1.address, BN_ONE_THOUSAND_WITH_DEC, SIX_MONTHS_BLOCKS);
      await expect(ERC20_PDN.connect(owner).addVest(add1.address, BN_ONE_THOUSAND_WITH_DEC, SIX_MONTHS_BLOCKS)).to.be.revertedWith("VEST_ALREADY_SET");
    });

    it("Can't Add Vest if owner balance is not sufficient", async function () {
      const RATIO = BN_ONE_THOUSAND;
      await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
      await ERC20_PDN.connect(owner).addVest(add1.address, BN_BILLION_WITH_DEC, SIX_MONTHS_BLOCKS);
      await expect(ERC20_PDN.connect(owner).addVest(add2.address, BN_ONE_THOUSAND_WITH_DEC, SIX_MONTHS_BLOCKS)).to.be.revertedWith("INSUFFICIENT_OWNER_BALANCE");
    });

    it("Withdraw Vest", async function () {
      const RATIO = BN_ONE_THOUSAND;
      const DURATION = 5;
      await ERC20_PDN.setERC1155(ERC1155_PDN.address, ERC1155_PDN_ID, RATIO);
      await ERC20_PDN.connect(owner).addVest(add1.address, BN_ONE_THOUSAND_WITH_DEC, DURATION);
      for (let index = 0; index < DURATION; index++) { await ethers.provider.send("evm_mine"); }
      await ERC20_PDN.connect(add1).withdrawVest();
      const vestMetaData = await ERC20_PDN.getVestMetaData(add1.address);
      await expect(vestMetaData[0]).to.equals(0);
      await expect(vestMetaData[1]).to.equals(0);
      expect(await ERC20_PDN.balanceOf(add1.address)).to.equals(BN_ONE_THOUSAND_WITH_DEC);
    });

    it("Can't Withdraw Vest if not set", async function () {
      await expect(ERC20_PDN.connect(add1).withdrawVest()).to.be.revertedWith("VEST_NOT_SET");
    });

    it("Can't Withdraw Vest if not expired", async function () {
      await ERC20_PDN.connect(owner).addVest(add1.address, BN_ONE_THOUSAND_WITH_DEC, SIX_MONTHS_BLOCKS);
      await expect(ERC20_PDN.connect(add1).withdrawVest()).to.be.revertedWith("VEST_NOT_EXPIRED");
    });
    
    it("Can't Run withdraw if locked amount is greater than amounts requests", async function () {
      const ADDRESSES = [add1.address, add2.address, add3.address];
      const AMOUNTS = [BN_ONE_THOUSAND, BN_FIVE_THOUSAND, BN_TEN_THOUSAND.mul(2)];
      await ERC20_PDN.connect(owner).addVest(add1.address, BN_BILLION_WITH_DEC, SIX_MONTHS_BLOCKS);
      await expect(ERC20_PDN.connect(owner).runAirdrop(ADDRESSES, AMOUNTS, 18)).to.be.revertedWith("INSUFFICIENT_OWNER_BALANCE");
    });


});
