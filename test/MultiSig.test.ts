const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { waffle, ethers } = require('hardhat');
const { web3 } = require('web3')
const Web3Utils = require('web3-utils');

const BYTES4DATA = [Web3Utils.toHex('A1B2'), Web3Utils.toHex('B2C3')];

enum pollTypeMetaData{
    NULL,
    CHANGE_CREATOR,
    DELETE_ADDRESS_ON_MULTISIG_LIST,
    ADD_ADDRESS_ON_MULTISIG_LIST,
    UNFREEZE
}

enum multiSigPollStruct{
    POLL_TYPE,
    POLLBLOCKSTART,
    //HASVOTED,
    //VOTERECEIVED
}

// ----------------------------------------------------------------------------------------------- SMART CONTRACT DEPLOYMENT

async function accessibilitySettingsDeploy() {
  const AccessibilitySettingsContractFactory = await ethers.getContractFactory("AccessibilitySettings");
  return await AccessibilitySettingsContractFactory.deploy();
}

async function multiSigDeploy(accessibilitySettingsAddress, multiSigAddressList) {
    const AccessibilitySettingsContractFactory = await ethers.getContractFactory("MultiSig");
    return await AccessibilitySettingsContractFactory.deploy(accessibilitySettingsAddress, multiSigAddressList);
}

async function dynamicERC20UpgradeableDeploy(accountabilityAddress) {
    const DynamicERC20UpgradeableContractFactory = await ethers.getContractFactory("DynamicERC20Upgradeable");
    return await DynamicERC20UpgradeableContractFactory.deploy(accountabilityAddress);
}

async function accountabilityDeploy(accessibilitySettingsAddress) {
    const AccountabilityContractFactory = await ethers.getContractFactory("Accountability");
    return await AccountabilityContractFactory.deploy(accessibilitySettingsAddress);
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
        MultiSig = await multiSigDeploy(AccessibilitySettings.address, multiSigAddressList);
    });
  
    it("createMultiSigPoll - Can't be run from stranger address", async function () {
        const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
        await expect(MultiSig.connect(add1).createMultiSigPoll(pollTypeID)).to.be.revertedWith("NOT_ABLE_TO_CREATE_A_MULTISIG_POLL");

    });
  
    it("createMultiSigPoll - Can't set not valid ID", async function () {
        const pollTypeID = pollTypeMetaData.NULL;
        await expect(MultiSig.connect(owner).createMultiSigPoll(pollTypeID)).to.be.revertedWith("POLL_ID_DISMATCH");
    });

    it("createMultiSigPoll - Change Creator", async function () {
        const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        const events = await MultiSig.queryFilter(MultiSig.filters.NewMultisigPollEvent());
        const lastEvent = events[events.length-1];
        const pollIndex = await MultiSig.indexPoll();
        expect(lastEvent.args.creator).to.equals(owner.address);
        expect(ethers.BigNumber.from(lastEvent.args.pollIndex)).to.equals(pollIndex);
        expect(lastEvent.args.pollType).to.equals(pollTypeID);
    });

    it("voteMultiSigPoll - Can't be run from stranger address", async function () {
        const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        const pollIndex = await MultiSig.indexPoll();
        await expect(MultiSig.connect(add1).voteMultiSigPoll(pollIndex, add1.address)).to.be.revertedWith("NOT_ABLE_TO_VOTE_FOR_A_MULTISIG_POLL");
    });

    it("voteMultiSigPoll - Can't vote two times for the same poll", async function () {
        const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        const pollIndex = await MultiSig.indexPoll();
        await MultiSig.connect(owner).voteMultiSigPoll(pollIndex, add1.address);
        await expect(MultiSig.connect(owner).voteMultiSigPoll(pollIndex, add1.address)).to.be.revertedWith("ADDRESS_HAS_ALREADY_VOTED");
    });

    it("voteMultiSigPoll - Vote without actions (<3/5)", async function () {
        const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        const pollIndex = await MultiSig.indexPoll();
        const tx = await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, add2.address);
        const oldOwner = await AccessibilitySettings.getDAOCreator();
        const events = await MultiSig.queryFilter(MultiSig.filters.VoteMultisigPollEvent());
        const lastEvent = events[events.length-1];
        expect(lastEvent.args.voter).to.equals(add5.address);
        expect(lastEvent.args.pollIndex).to.equals(pollIndex);
        expect(lastEvent.args.voteFor).to.equals(add2.address);
        const newOwner = await AccessibilitySettings.getDAOCreator();
        expect(newOwner).to.equals(oldOwner); // NO CHANGES
    });

    it("voteMultiSigPoll - Vote with actions (>=3/5) - change DAO creator", async function () {
        const pollTypeID = pollTypeMetaData.CHANGE_CREATOR;
        const oldOwner = await AccessibilitySettings.getDAOCreator();
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        const pollIndex = await MultiSig.indexPoll();
        await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, add2.address);
        await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, add2.address);
        await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, add2.address);
        const newOwner = await AccessibilitySettings.getDAOCreator();
        expect(newOwner).not.to.equals(oldOwner); //NO CHANGES
    });

    it("voteMultiSigPoll - Vote with actions (>=3/5) - Can't delete multisig if signature list lenght has minimum requirement", async function () {
        const pollTypeID = pollTypeMetaData.DELETE_ADDRESS_ON_MULTISIG_LIST;
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        const pollIndex = await MultiSig.indexPoll();
        await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, owner.address);
        await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, owner.address);
        await expect(MultiSig.connect(add7).voteMultiSigPoll(pollIndex, owner.address)).to.be.revertedWith("NOT_ENOUGH_MULTISIG_ADDRESSES");
    });

    it("voteMultiSigPoll - Vote with actions (>=3/5) - Add new address on multisig", async function () {
        const pollTypeID = pollTypeMetaData.ADD_ADDRESS_ON_MULTISIG_LIST;
        const oldAddressIsInMultisig = await MultiSig.multiSigDAO(add2.address);
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        const pollIndex = await MultiSig.indexPoll();
        await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, add2.address);
        await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, add2.address);
        await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, add2.address);
        const newAddressIsInMultisig = await MultiSig.multiSigDAO(add2.address);
        expect(newAddressIsInMultisig).to.equals(!oldAddressIsInMultisig);
    });

    it("voteMultiSigPoll - Vote with actions (>=3/5) - Can't add new address on multisig if already present", async function () {
        const pollTypeID = pollTypeMetaData.ADD_ADDRESS_ON_MULTISIG_LIST;
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        const pollIndex = await MultiSig.indexPoll();
        await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, add5.address);
        await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, add5.address);
        await expect(MultiSig.connect(add7).voteMultiSigPoll(pollIndex, add5.address)).to.be.revertedWith("CANT_ADD_EXISTING_ADDRESS");

    });

    it("voteMultiSigPoll - Vote with actions - Delete address on multisig", async function () {
        let pollTypeID = pollTypeMetaData.ADD_ADDRESS_ON_MULTISIG_LIST;
        expect(await MultiSig.multiSigDAO(add2.address)).to.equals(false);
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        let pollIndex = await MultiSig.indexPoll();
        // Minimum: 3/5
        await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, add2.address);
        await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, add2.address);
        await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, add2.address);
        expect(await MultiSig.multiSigDAO(add2.address)).to.equals(true);
        pollTypeID = pollTypeMetaData.DELETE_ADDRESS_ON_MULTISIG_LIST;
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        pollIndex = await MultiSig.indexPoll();
        // Minimum 4/6
        await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, add2.address);
        await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, add2.address);
        await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, add2.address);
        await MultiSig.connect(add8).voteMultiSigPoll(pollIndex, add2.address);
        expect(await MultiSig.multiSigDAO(add2.address)).to.equals(false);
    });

    it("voteMultiSigPoll - Vote with actions - Can't delete address on multisig if not present", async function () {
        let pollTypeID = pollTypeMetaData.ADD_ADDRESS_ON_MULTISIG_LIST;
        expect(await MultiSig.multiSigDAO(add2.address)).to.equals(false);
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        let pollIndex = await MultiSig.indexPoll();
        // Minimum: 3/5
        await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, add2.address);
        await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, add2.address);
        await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, add2.address);
        expect(await MultiSig.multiSigDAO(add2.address)).to.equals(true);
        pollTypeID = pollTypeMetaData.DELETE_ADDRESS_ON_MULTISIG_LIST;
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        pollIndex = await MultiSig.indexPoll();
        // Minimum 4/6
        await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, add3.address);
        await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, add3.address);
        await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, add3.address);
        await expect(MultiSig.connect(add8).voteMultiSigPoll(pollIndex, add3.address)).to.be.revertedWith("CANT_DELETE_NOT_EXISTING_ADDRESS");
    });

    it("voteMultiSigPoll - Vote with actions - Can't delete address on multisig if minimum we don't have 5 addresses", async function () {
        const pollTypeID = pollTypeMetaData.DELETE_ADDRESS_ON_MULTISIG_LIST;
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        const pollIndex = await MultiSig.indexPoll();
        await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, add5.address);
        await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, add5.address);
        await expect(MultiSig.connect(add8).voteMultiSigPoll(pollIndex, add5.address)).to.be.revertedWith("NOT_ENOUGH_MULTISIG_ADDRESSES");
    });

    it("voteMultiSigPoll - Vote with actions - Unfreeze", async function () {
        const pollTypeID = pollTypeMetaData.UNFREEZE;
        await MultiSig.connect(owner).createMultiSigPoll(pollTypeID);
        const pollIndex = await MultiSig.indexPoll();
        expect(await AccessibilitySettings.isFrozen()).to.equals(false);
        await AccessibilitySettings.connect(owner).freeze();
        expect(await AccessibilitySettings.isFrozen()).to.equals(true);
        await MultiSig.connect(add5).voteMultiSigPoll(pollIndex, ZERO_ADDRESS);
        await MultiSig.connect(add6).voteMultiSigPoll(pollIndex, ZERO_ADDRESS);
        await MultiSig.connect(add7).voteMultiSigPoll(pollIndex, ZERO_ADDRESS);
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
        AccessibilitySettings = await accessibilitySettingsDeploy();                                // Smart Contracts has to be
        MultiSig = await multiSigDeploy(AccessibilitySettings.address, multiSigAddressList);        // executed in this order
        Accountability = await accountabilityDeploy(AccessibilitySettings.address);                 // to run properly all variables
        DynamicERC20Upgradeable = await dynamicERC20UpgradeableDeploy(Accountability.address);      // inside of them
    });
  
    it("Dynamic ERC20 Upgradeable - Accountability Address on DERC20U match the smart cotract accountability address", async function () {
        expect(await DynamicERC20Upgradeable.accountabilityAddress()).to.equals(Accountability.address);
    });

    it("Dynamic ERC20 Upgradeable - Init new token - Check Accountability Token Referee", async function () {
        await DynamicERC20Upgradeable.connect(add1).initialize("TOKEN_NAME", "TOKEN_SYMBOL");
        expect(await Accountability.tokenReferreal(DynamicERC20Upgradeable.address)).to.equals(add1.address);
    });

    it("Dynamic ERC20 Upgradeable - A non init token has getLastBlockUserOp = 0", async function () {
        await DynamicERC20Upgradeable.connect(add1).initialize("TOKEN_NAME", "TOKEN_SYMBOL");
        expect(await Accountability.getLastBlockUserOp(DynamicERC20Upgradeable.address, add1.address)).not.to.equals(ethers.BigNumber.from("0"));
    });

    it("Dynamic ERC20 Upgradeable - Init new token - getLastBlockUserOp has to be > 0", async function () {
        await DynamicERC20Upgradeable.connect(add1).initialize("TOKEN_NAME", "TOKEN_SYMBOL");
        expect(await Accountability.getLastBlockUserOp(DynamicERC20Upgradeable.address, add1.address)).not.to.equals(ethers.BigNumber.from("0"));
    });

    it("Dynamic ERC20 Upgradeable - Init new token - Check if Token is deployed on blockchain", async function () {
        await DynamicERC20Upgradeable.connect(add1).initialize("TOKEN_NAME", "TOKEN_SYMBOL");
        const IERC20U = await ethers.getContractAt("IERC20", DynamicERC20Upgradeable.address);
        expect(await IERC20U.balanceOf(add1.address)).to.equals(ethers.BigNumber.from("0"));
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
    multiSig = await multiSigDeploy(accessibilitySettings.address, multiSigAddressList);        // executed in this order
    accountability = await accountabilityDeploy(accessibilitySettings.address);                 // to run properly all variables
    dynamicERC20Upgradeable = await dynamicERC20UpgradeableDeploy(accountability.address);      // inside of them
    await dynamicERC20Upgradeable.initialize("TOKEN_NAME_1", "TOKEN_SYM_1");
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
          if(event.args.smartContractReference == accountability.address && event.args.Accessibility == true){
              if(signatures.indexOf(event.args.functionSignature) === -1){
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
          if(event.args.smartContractReference == accountability.address && event.args.Accessibility == true){
              if(signatures.indexOf(event.args.functionSignature) === -1){
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
          if(event.args.smartContractReference == accountability.address && event.args.Accessibility == true){
              if(signatures.indexOf(event.args.functionSignature) === -1){
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
          if(event.args.smartContractReference == accountability.address && event.args.Accessibility == true){
              if(signatures.indexOf(event.args.functionSignature) === -1){
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
          if(event.args.smartContractReference == accountability.address && event.args.Accessibility == true){
              if(signatures.indexOf(event.args.functionSignature) === -1){
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
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    const tokenAddress = dynamicERC20Upgradeable.address;
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
    const tokenAddress = dynamicERC20Upgradeable.address;
    await expect(accountability.connect(add1).addBalance(tokenAddress, add1.address, tenThousoundsWithDecimals)).to.be.revertedWith("ACCESS_DENIED");
  });

  it("Sub Balance with accessibility", async function () {
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    const fiveThousoundsWithDecimals = ethers.BigNumber.from("5000000000000000000000000");
    const tokenAddress = dynamicERC20Upgradeable.address;
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
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).addBalance(tokenAddress, add1.address, tenThousoundsWithDecimals);
    await expect(accountability.connect(add1).subBalance(tokenAddress, add1.address, fiveThousoundsWithDecimals)).to.be.revertedWith("ACCESS_DENIED");
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

  it("Can Mint ERC20 Token with correct referee and data", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const billionWithDecimals = ethers.BigNumber.from("1000000000000000000000000000");
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).mintUpgradeableERC20Token(tokenAddress, billion);
    const IERC20Upgradeable = await ethers.getContractAt("IERC20Upgradeable", tokenAddress);
    expect(await IERC20Upgradeable.balanceOf(accountability.address)).to.equals(billionWithDecimals);
  });

  it("Can't mint ERC20 Token with wrong referee", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const tokenAddress = dynamicERC20Upgradeable.address;
    accountability.connect(owner).setUserListRole([add1.address], [1]); // add1 can run mintUpgradeableERC20Token
    await expect(accountability.connect(add1).mintUpgradeableERC20Token(tokenAddress, billion)).to.be.revertedWith("REFEREE_DISMATCH");
  });

  it("Can't mint ERC20 Token with 0 amount", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).setUserListRole([add1.address], [1]); // add1 can run mintUpgradeableERC20Token
    await expect(accountability.connect(owner).mintUpgradeableERC20Token(tokenAddress, ethers.BigNumber.from("0"))).to.be.revertedWith("INSUFFICIENT_AMOUNT");
  });

  it("Can burn ERC20 token with correct referee and data", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const billionWithDecimals = ethers.BigNumber.from("1000000000000000000000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).mintUpgradeableERC20Token(tokenAddress, billion);
    await accountability.connect(owner).burnUpgradeableERC20Token(tokenAddress, tenThousoundsWithDecimals);
    const IERC20Upgradeable = await ethers.getContractAt("IERC20Upgradeable", tokenAddress);
    expect(await IERC20Upgradeable.balanceOf(accountability.address)).to.equals(billionWithDecimals.sub(tenThousoundsWithDecimals));
  });

  it("Can't burn ERC20 token with wrong referee", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).setUserListRole([add1.address], [1]); // add1 can run burnUpgradeableERC20Token
    await expect(accountability.connect(add1).burnUpgradeableERC20Token(tokenAddress, tenThousoundsWithDecimals)).to.be.revertedWith("REFEREE_DISMATCH");
  });

  it("Can't burn ERC20 token with 0 amount", async function () {
    const tokenAddress = dynamicERC20Upgradeable.address;
    await expect(accountability.connect(owner).burnUpgradeableERC20Token(tokenAddress, ethers.BigNumber.from("0"))).to.be.revertedWith("INSUFFICIENT_AMOUNT");
  });

  it("Can burn ERC20 Token if the amount is greater than the token balance of the contract itself", async function () {
    const billionWithDecimalsPlus1 = ethers.BigNumber.from("1000000000000000000000000001");
    const tokenAddress = dynamicERC20Upgradeable.address;
    await expect(accountability.connect(owner).burnUpgradeableERC20Token(tokenAddress, billionWithDecimalsPlus1)).to.be.revertedWith("BALANCE_SECURITY_DISMATCH");
  });

  it("Can approve ERC20 Token with the correct referee and data directly from IERC20U", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).mintUpgradeableERC20Token(tokenAddress, billion); // mint doesn't require decimals
    await accountability.connect(owner).approveERC20Distribution(tokenAddress, tenThousoundsWithDecimals); // approve and burn yes
    const IERC20Upgradeable = await ethers.getContractAt("IERC20Upgradeable", tokenAddress);
    expect(await IERC20Upgradeable.allowance(accountability.address, accountability.address)).to.equals(tenThousoundsWithDecimals);
  });

  it("Can't approve ERC20 Token if referee dismatch", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).mintUpgradeableERC20Token(tokenAddress, billion); // mint doesn't require decimals
    await accountability.connect(owner).setUserListRole([add1.address], [1]); // add1 can run approveERC20Distribution
    await expect(accountability.connect(add1).approveERC20Distribution(tokenAddress, tenThousoundsWithDecimals)).to.be.revertedWith("REFEREE_DISMATCH");
  });

  it("Can't approve ERC20 Token if token is NULL", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).mintUpgradeableERC20Token(tokenAddress, billion); // mint doesn't require decimals
    await accountability.connect(owner).setUserListRole([add1.address], [1]); // add1 can run approveERC20Distribution
    await expect(accountability.connect(add1).approveERC20Distribution(ZERO_ADDRESS, tenThousoundsWithDecimals)).to.be.revertedWith("NULL_ADD_NOT_ALLOWED");
  });

  it("Can't approve ERC20 Token if amount is 0", async function () {
    const billion = ethers.BigNumber.from("1000000000");
    const tokenAddress = dynamicERC20Upgradeable.address;
    await accountability.connect(owner).mintUpgradeableERC20Token(tokenAddress, billion); // mint doesn't require decimals
    await accountability.connect(owner).setUserListRole([add1.address], [1]); // add1 can run approveERC20Distribution
    await expect(accountability.connect(add1).approveERC20Distribution(tokenAddress, ethers.BigNumber.from("0"))).to.be.revertedWith("NULL_AMOUNT_NOT_ALLOWED");
  });

  it("Redeem list of ERC20", async function () {
    // CREATE TOKENS
    const billion = ethers.BigNumber.from("1000000000");
    const tenThousoundsWithDecimals = ethers.BigNumber.from("10000000000000000000000000");
    const dynamicERC20Upgradeable2 = await dynamicERC20UpgradeableDeploy(accountability.address);      // inside of them
    const dynamicERC20Upgradeable3 = await dynamicERC20UpgradeableDeploy(accountability.address);      // inside of them
    await dynamicERC20Upgradeable2.initialize("TOKEN_NAME_2", "TOKEN_SYM_2");
    await dynamicERC20Upgradeable3.initialize("TOKEN_NAME_3", "TOKEN_SYM_3");
    const tokenList = [dynamicERC20Upgradeable.address, dynamicERC20Upgradeable2.address,  dynamicERC20Upgradeable3.address];
    // MINT TOKENS
    await accountability.connect(owner).mintUpgradeableERC20Token(tokenList[0], billion); // mint doesn't require decimals
    await accountability.connect(owner).mintUpgradeableERC20Token(tokenList[1], billion); // mint doesn't require decimals
    await accountability.connect(owner).mintUpgradeableERC20Token(tokenList[2], billion); // mint doesn't require decimals
    // ADD LOCAL BALANCE TO AN ADDRESS
    await accountability.connect(owner).addBalance(tokenList[0], add1.address, tenThousoundsWithDecimals);
    await accountability.connect(owner).addBalance(tokenList[1], add1.address, tenThousoundsWithDecimals);
    await accountability.connect(owner).addBalance(tokenList[2], add1.address, tenThousoundsWithDecimals);
    // CHECK BALANCES OF TOKEN LIST
    expect(await accountability.getBalance(tokenList[0], add1.address)).to.equals(tenThousoundsWithDecimals);
    expect(await accountability.getBalance(tokenList[1], add1.address)).to.equals(tenThousoundsWithDecimals);
    expect(await accountability.getBalance(tokenList[2], add1.address)).to.equals(tenThousoundsWithDecimals);
    // INCREASE ALLOWANCE
    await accountability.connect(owner).approveERC20Distribution(tokenList[0], tenThousoundsWithDecimals);
    await accountability.connect(owner).approveERC20Distribution(tokenList[1], tenThousoundsWithDecimals);
    await accountability.connect(owner).approveERC20Distribution(tokenList[2], tenThousoundsWithDecimals);
    // REDEEM LIST OF TOKENS
    await accountability.connect(add1).redeemListOfERC20(tokenList);
    // CHECK EVENTS
    const changeBalanceEvents = await accountability.queryFilter(accountability.filters.ChangeBalanceEvent());
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.caller).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.token).to.equals(tokenList[0]);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.oldBalance).to.equals(tenThousoundsWithDecimals);
    expect(changeBalanceEvents[changeBalanceEvents.length - 3].args.newBalance).to.equals(ethers.BigNumber.from("0"));
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.caller).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.token).to.equals(tokenList[1]);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.oldBalance).to.equals(tenThousoundsWithDecimals);
    expect(changeBalanceEvents[changeBalanceEvents.length - 2].args.newBalance).to.equals(ethers.BigNumber.from("0"));
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.caller).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.token).to.equals(tokenList[2]);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.user).to.equals(add1.address);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.oldBalance).to.equals(tenThousoundsWithDecimals);
    expect(changeBalanceEvents[changeBalanceEvents.length - 1].args.newBalance).to.equals(ethers.BigNumber.from("0"));
    const redeemEvents = await accountability.queryFilter(accountability.filters.RedeemEvent());
    expect(redeemEvents[redeemEvents.length - 3].args.caller).to.equals(add1.address);
    expect(redeemEvents[redeemEvents.length - 3].args.token).to.equals(tokenList[0]);
    expect(redeemEvents[redeemEvents.length - 3].args.redeemAmount).to.equals(tenThousoundsWithDecimals);
    expect(redeemEvents[redeemEvents.length - 2].args.caller).to.equals(add1.address);
    expect(redeemEvents[redeemEvents.length - 2].args.token).to.equals(tokenList[1]);
    expect(redeemEvents[redeemEvents.length - 2].args.redeemAmount).to.equals(tenThousoundsWithDecimals);    
    expect(redeemEvents[redeemEvents.length - 1].args.caller).to.equals(add1.address);
    expect(redeemEvents[redeemEvents.length - 1].args.token).to.equals(tokenList[2]);
    expect(redeemEvents[redeemEvents.length - 1].args.redeemAmount).to.equals(tenThousoundsWithDecimals);
    // CHECK EACH TOKEN BALANCE FOR ADDRESS
    const IERC20Upgradeable1 = await ethers.getContractAt("IERC20Upgradeable", tokenList[0]);
    const IERC20Upgradeable2 = await ethers.getContractAt("IERC20Upgradeable", tokenList[1]);
    const IERC20Upgradeable3 = await ethers.getContractAt("IERC20Upgradeable", tokenList[2]);
    expect(await IERC20Upgradeable1.balanceOf(add1.address)).to.equals(tenThousoundsWithDecimals);
    expect(await IERC20Upgradeable2.balanceOf(add1.address)).to.equals(tenThousoundsWithDecimals);
    expect(await IERC20Upgradeable3.balanceOf(add1.address)).to.equals(tenThousoundsWithDecimals);
  });

  it("Revert in case all tokens to redeem have amount null", async function () {
      // CREATE TOKENS
      const billion = ethers.BigNumber.from("1000000000");
      const dynamicERC20Upgradeable2 = await dynamicERC20UpgradeableDeploy(accountability.address);      // inside of them
      const dynamicERC20Upgradeable3 = await dynamicERC20UpgradeableDeploy(accountability.address);      // inside of them
      await dynamicERC20Upgradeable2.initialize("TOKEN_NAME_2", "TOKEN_SYM_2");
      await dynamicERC20Upgradeable3.initialize("TOKEN_NAME_3", "TOKEN_SYM_3");
      const tokenList = [dynamicERC20Upgradeable.address, dynamicERC20Upgradeable2.address,  dynamicERC20Upgradeable3.address];
      // MINT TOKENS
      await accountability.connect(owner).mintUpgradeableERC20Token(tokenList[0], billion); // mint doesn't require decimals
      await accountability.connect(owner).mintUpgradeableERC20Token(tokenList[1], billion); // mint doesn't require decimals
      await accountability.connect(owner).mintUpgradeableERC20Token(tokenList[2], billion); // mint doesn't require decimals
      await expect(accountability.connect(add1).redeemListOfERC20(tokenList)).to.be.revertedWith("NO_TOKENS");
  });

  // --do all negative tests for redeem
});