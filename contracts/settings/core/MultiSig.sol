// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '../../interfaces/IAccessibilitySettings.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';
import '../../interfaces/IERC20_PDN.sol';

contract MultiSig is Initializable{

    using SafeMathUpgradeable for uint256;
 
    uint N_BLOCK_DAY = uint(5760);
    uint N_BLOCK_WEEK = uint(7).mul(N_BLOCK_DAY);

    struct multiSigPollStruct {
        uint pollType;
        uint pollBlockStart;
        mapping(address => bool) hasVoted;
        mapping(address => uint) voteReceived;
    }

    enum pollTypeMetaData{
        NULL,
        CHANGE_CREATOR,
        DELETE_ADDRESS_ON_MULTISIG_LIST,
        ADD_ADDRESS_ON_MULTISIG_LIST,
        UNFREEZE,
        CHANGE_PDN_SMARTCONTRACT_OWNER
    }

    mapping(address => bool) public multiSigDAO;
    uint public multiSigLength;
    mapping(uint => multiSigPollStruct) public multiSigPoll;

    uint public indexPoll;

    address public accessibilitySettingsAddress;
    address public ERC20Address;

    event NewMultisigPollEvent(address indexed creator, uint pollIndex, uint pollType);
    event VoteMultisigPollEvent(address indexed voter, uint pollIndex, address voteFor);
    event ChangeStatementMultisigPollEvent(address voted, uint pollType);

    function initialize(address _accessibilitySettingsAddress, address[] memory _multiSigAddresses) public {
        require(_accessibilitySettingsAddress != address(0), "CANT_SET_NULL_ADDRESS");
        require(_multiSigAddresses.length >= 5, "MULTISIG_NEEDS_MIN_5_ADDRESSES");
        accessibilitySettingsAddress = _accessibilitySettingsAddress;
        for(uint index = 0; index < _multiSigAddresses.length; index++){
            require(_multiSigAddresses[index] != address(0), "CANT_SET_NULL_ADDRESS");
            multiSigDAO[_multiSigAddresses[index]] = true;
        }
        multiSigLength = _multiSigAddresses.length;
        IAccessibilitySettings(accessibilitySettingsAddress).multiSigInitialize(address(this));
    }

    function createMultiSigPoll(uint _pollTypeID) public returns(uint){
        require(multiSigDAO[msg.sender], "NOT_ABLE_TO_CREATE_A_MULTISIG_POLL");
        require(_pollTypeID == uint(pollTypeMetaData.CHANGE_CREATOR) || _pollTypeID ==  uint(pollTypeMetaData.ADD_ADDRESS_ON_MULTISIG_LIST) || _pollTypeID ==  uint(pollTypeMetaData.DELETE_ADDRESS_ON_MULTISIG_LIST) || _pollTypeID ==  uint(pollTypeMetaData.UNFREEZE), "POLL_ID_DISMATCH");
        uint refPollIndex = indexPoll.add(1);
        indexPoll = refPollIndex;
        multiSigPoll[refPollIndex].pollType = _pollTypeID;
        multiSigPoll[refPollIndex].pollBlockStart = block.number;
        emit NewMultisigPollEvent(msg.sender, refPollIndex, _pollTypeID);
        return refPollIndex;
    }

    function voteMultiSigPoll(uint _pollIndex, address _voteForAddress) public returns(bool){
        require(multiSigDAO[msg.sender], "NOT_ABLE_TO_VOTE_FOR_A_MULTISIG_POLL");
        uint refPollIndex = indexPoll;
        require((block.number).sub(multiSigPoll[refPollIndex].pollBlockStart) <= N_BLOCK_WEEK, "MULTISIG_POLL_EXPIRED");
        bool hasVoted = multiSigPoll[refPollIndex].hasVoted[msg.sender];
        require(!hasVoted, "ADDRESS_HAS_ALREADY_VOTED");
        multiSigPoll[refPollIndex].hasVoted[msg.sender] = true;
        uint voteForCount = multiSigPoll[refPollIndex].voteReceived[_voteForAddress];
        multiSigPoll[refPollIndex].voteReceived[_voteForAddress] = voteForCount.add(1);
        if((voteForCount.add(1)).mul(uint(2)) > multiSigLength){ 
            runMultiSigFunction(multiSigPoll[_pollIndex].pollType, _voteForAddress);
            emit ChangeStatementMultisigPollEvent(_voteForAddress, multiSigPoll[refPollIndex].pollType);
            multiSigPoll[refPollIndex].pollType = uint(pollTypeMetaData.NULL);
        }
        emit VoteMultisigPollEvent(msg.sender, _pollIndex, _voteForAddress);
        return true;
    }

    function runMultiSigFunction(uint _functionID, address _voteFor) private returns(bool){
        if(_functionID == uint(pollTypeMetaData.CHANGE_CREATOR)){
            IAccessibilitySettings(accessibilitySettingsAddress).changeDAOCreator(_voteFor);
        }
        if(_functionID == uint(pollTypeMetaData.DELETE_ADDRESS_ON_MULTISIG_LIST)){
            uint newMultiSigLength = multiSigLength.sub(1);
            require(newMultiSigLength >= uint(5), "NOT_ENOUGH_MULTISIG_ADDRESSES");
            require(multiSigDAO[_voteFor], "CANT_DELETE_NOT_EXISTING_ADDRESS");
            multiSigLength = newMultiSigLength;
            multiSigDAO[_voteFor] = false;
        }        
        if(_functionID == uint(pollTypeMetaData.ADD_ADDRESS_ON_MULTISIG_LIST)){
            require(!multiSigDAO[_voteFor], "CANT_ADD_EXISTING_ADDRESS");
            multiSigLength = multiSigLength.add(1);
            multiSigDAO[_voteFor] = true;
        }
        if(_functionID == uint(pollTypeMetaData.UNFREEZE)){
            IAccessibilitySettings(accessibilitySettingsAddress).restoreIsFrozen();
        }
        if(_functionID == uint(pollTypeMetaData.CHANGE_PDN_SMARTCONTRACT_OWNER)){
            address tmpERC20Address = ERC20Address;
            require(tmpERC20Address != address(0), "CANT_CHANGE_PDN_OWNER_OF_NULL_ADDRESS"); //TEST
            IERC20_PDN(tmpERC20Address).changeOwnerWithMultisigDAO(_voteFor);
        }
        return true;
    }

    function getMultiSigLength() public view returns(uint){
        return multiSigLength;
    }

    function getIsMultiSigAddress(address _address) public view returns(bool){
        return multiSigDAO[_address];
    }

    function getMultiSigPollVotes(address _voteFor, uint _pollID) public view returns(uint){
        return multiSigPoll[_pollID].voteReceived[_voteFor];
    }

    function getMultiSigPollHasVoted(address _voter, uint _pollID) public view returns(bool){
        return multiSigPoll[_pollID].hasVoted[_voter];
    }

    function getListOfActivePoll() public view returns(uint[] memory){
        uint refPollIndex = indexPoll;
        uint countActive = uint(0);
        bool[] memory activePolls = new bool[](uint(refPollIndex));
        for(uint index = uint(0); index < refPollIndex; index++){
            if(multiSigPoll[index].pollType != uint(pollTypeMetaData.NULL)){
                if((block.number).sub(multiSigPoll[index].pollBlockStart) <= N_BLOCK_WEEK){
                    activePolls[index] = true;
                    countActive = countActive.add(1);
                } 
            }
        }
        uint[] memory resultActivePoll = new uint[](uint(countActive));
        uint tmpIndex = uint(0);
        for(uint index = uint(0); index < refPollIndex; index++){
            if(activePolls[index]){
                resultActivePoll[tmpIndex] = index;
                tmpIndex = tmpIndex.add(1);
            }
        }
        return resultActivePoll;
    }

    function setERC1155Address(address _ERC20Address) public returns(bool){
        require(getIsMultiSigAddress(msg.sender), "REQUIRE_MULTISIG_ADDRESS");
        ERC20Address = _ERC20Address;
        return true;
    }
}