const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { waffle, ethers } = require('hardhat');
const { web3 } = require('web3')
const Web3Utils = require('web3-utils');
const showLog = false;

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

const BYTES4DATA = [Web3Utils.toHex('A1B2'), Web3Utils.toHex('B2C3')]; // Example bytes4 Data

async function accessibilitySettingsDeploy() {
  const AccessibilitySettingsContractFactory = await ethers.getContractFactory("AccessibilitySettings");
  return await AccessibilitySettingsContractFactory.deploy();
}

async function multiSigDeploy(accessibilitySettingsAddress, multiSigAddressList) {
    const AccessibilitySettingsContractFactory = await ethers.getContractFactory("MultiSig");
    return await AccessibilitySettingsContractFactory.deploy(accessibilitySettingsAddress, multiSigAddressList);
  }

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
        const oldAddressIsInMultisig = await MultiSig.multiSigDAO(add2.address);
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