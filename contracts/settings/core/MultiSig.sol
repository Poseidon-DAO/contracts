// SPDX-License-Identifier: MIT

/*
  _____               _     _               _____          ____  
 |  __ \             (_)   | |             |  __ \   /\   / __ \ 
 | |__) ___  ___  ___ _  __| | ___  _ __   | |  | | /  \ | |  | |
 |  ___/ _ \/ __|/ _ | |/ _` |/ _ \| '_ \  | |  | |/ /\ \| |  | |
 | |  | (_) \__ |  __| | (_| | (_) | | | | | |__| / ____ | |__| |
 |_|   \___/|___/\___|_|\__,_|\___/|_| |_| |_____/_/    \_\____/ 
                                                                 
*/

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
        address voteReceiverAddress;
        uint amountApprovedVoteReceiver;             // Number of Approved vote received for this poll
        mapping(address => uint) vote;               // Vote received from the multisig addess
    }

    enum pollTypeMetaData{
        NULL,
        CHANGE_CREATOR,
        DELETE_ADDRESS_ON_MULTISIG_LIST,
        ADD_ADDRESS_ON_MULTISIG_LIST,
        UNFREEZE,
        CHANGE_PDN_SMARTCONTRACT_OWNER,
        DELETE_PDN_VEST
    }

    enum voteMetaData {
        NULL,
        APPROVED,
        DECLINED
    }

    // Mapping to identify if an address is inside the multisig or not
    mapping(address => bool) public multiSigDAO;  
    // Mapping to have a chronological indexed polls management  
    mapping(uint => multiSigPollStruct) public multiSigPoll;

    uint public indexPoll;
    uint public multiSigLength;

    address public accessibilitySettingsAddress;
    address public ERC20Address;

    event NewMultisigPollEvent(address indexed creator, uint  pollIndex, uint pollType, address voteReceiver);
    event VoteMultisigPollEvent(address indexed voter, uint pollIndex, uint vote);
    event ChangeStatementMultisigPollEvent(uint pollIndex, address voteReceiver);

    /*
    * @dev: This function allows to initialize the smart contract setting:
    *       - The { accessibilySettingsAddress }
    *       - The list of addresses that will be inside the multisig
    *
    *       The multisig will be initialized inside the accessibility settings smart contract
    *
    * Requirements:
    *       - { accessibilySettingsAddress } can not be null address
    *       - The number of multisig has to be greater or equal to 5
    *       - Can't set a null address such a multisig
    * Events:
    *       - initialize
    */

    function initialize(address _accessibilitySettingsAddress, address[] memory _multiSigAddresses) public {
        require(_accessibilitySettingsAddress != address(0), "CANT_SET_NULL_ADDRESS");
        require(_multiSigAddresses.length >= 5, "MULTISIG_NEEDS_MIN_5_ADDRESSES");
        accessibilitySettingsAddress = _accessibilitySettingsAddress;
        bool duplicates;
        for(uint i = 0; i < _multiSigAddresses.length; i++){
            for(uint j = 0; j < _multiSigAddresses.length; j++){
                if(_multiSigAddresses[i] == _multiSigAddresses[j] && i != j){
                    duplicates = true;
                }
            }
        }
        require(!duplicates, "CANT_SET_TWO_TIME_THE_SAME_ADDRESS");
        for(uint index = 0; index < _multiSigAddresses.length; index++){
            require(_multiSigAddresses[index] != address(0), "CANT_SET_NULL_ADDRESS");
            multiSigDAO[_multiSigAddresses[index]] = true;
        }
        multiSigLength = _multiSigAddresses.length;
        IAccessibilitySettings(accessibilitySettingsAddress).multiSigInitialize(address(this));
    }

    /*
    * @dev: This function allows to create a poll. Each poll has to have:
    *       - A { pollTypeID } that will identify the action that will be done after the 50%+1
    *       - The address where the action will be done
    *
    * Requirements:
    *       - Only who is inside the multisig can run this function
    *       - { pollTypeId } has to be inside the possible range of action
    *
    * Events:
    *       - NewMultisigPollEvent
    */

    function createMultiSigPoll(uint _pollTypeID, address _voteReceiverAddress) public returns(uint){
        require(multiSigDAO[msg.sender], "NOT_ABLE_TO_CREATE_A_MULTISIG_POLL");
        require(_pollTypeID > uint(pollTypeMetaData.NULL) && _pollTypeID <= uint(pollTypeMetaData.CHANGE_PDN_SMARTCONTRACT_OWNER), "POLL_ID_DISMATCH");
        uint refPollIndex = indexPoll.add(1);
        indexPoll = refPollIndex;
        multiSigPoll[refPollIndex].pollType = _pollTypeID;
        multiSigPoll[refPollIndex].pollBlockStart = block.number;
        multiSigPoll[refPollIndex].voteReceiverAddress = _voteReceiverAddress;
        emit NewMultisigPollEvent(msg.sender, refPollIndex, _pollTypeID, _voteReceiverAddress);
        return refPollIndex;
    }

    /*
    * @dev: This function allows to vote a poll.
    *       - Every multisig address can vote indipendently from each other
    *       - The action will be done automatically at 50% + 1 (that will follow the delete of the poll itself)
    *
    * Requirements:
    *       - voteState has to be or Approved or Declined
    *       - only a multisig address can vote
    *       - poll has to not be expired (1 WEEK length rule)
    *       - the address can't vote 2 times
    *
    * Events:
    *       - ChangeStatementMultisigPollEvent if 50% + 1 
    *       - VoteMultisigPollEvent always
    */

    function voteMultiSigPoll(uint _pollIndex, uint _vote) public returns(bool){
        require(_vote == uint(voteMetaData.APPROVED) || _vote == uint(voteMetaData.DECLINED), "VOTE_NOT_VALID");
        require(multiSigDAO[msg.sender], "NOT_ABLE_TO_VOTE_FOR_A_MULTISIG_POLL");
        uint amountApprovedVoteReceiver = multiSigPoll[_pollIndex].amountApprovedVoteReceiver;
        address voteReceiverAddress = multiSigPoll[_pollIndex].voteReceiverAddress;
        require((block.number).sub(multiSigPoll[_pollIndex].pollBlockStart) <= N_BLOCK_WEEK, "MULTISIG_POLL_EXPIRED");
        uint vote = multiSigPoll[_pollIndex].vote[msg.sender];
        require(vote == uint(voteMetaData.NULL), "ADDRESS_HAS_ALREADY_VOTED");
        multiSigPoll[_pollIndex].vote[msg.sender] = _vote;
        if(_vote == uint(voteMetaData.APPROVED)){
            multiSigPoll[_pollIndex].amountApprovedVoteReceiver = amountApprovedVoteReceiver.add(1);
            if((amountApprovedVoteReceiver.add(1)).mul(uint(2)) > multiSigLength){
                runMultiSigFunction(multiSigPoll[_pollIndex].pollType, voteReceiverAddress);
                emit ChangeStatementMultisigPollEvent(multiSigPoll[_pollIndex].pollType, voteReceiverAddress);
                delete multiSigPoll[_pollIndex];
            }
        }
        emit VoteMultisigPollEvent(msg.sender, _pollIndex, _vote);
        return true;
    }

    /*
    * @dev: This function is private and allows to execute an action from the poll voting system.
    *       Every pollTypeID will follow a specific action:
    *       1) Change DAO Creator
    *       2) Delete address from multisig (can't delete if we have the minimum number equals to 5)
    *          or o non existing address inside the multisig
    *       3) Add a new address on multisig (can't add an existing address)
    *       4) Restore an unfreeze state
    *       5) Change PDN token owner (can't change to a null address)
    *       6) Delete a PDN vest (need to set the ERC20 token first)
    */

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
            require(tmpERC20Address != address(0), "CANT_CHANGE_PDN_OWNER_OF_NULL_ADDRESS"); 
            IERC20_PDN(tmpERC20Address).changeOwnerWithMultisigDAO(_voteFor);
        }
        if(_functionID == uint(pollTypeMetaData.DELETE_PDN_VEST)){
            address tmpERC20Address = ERC20Address;
            require(tmpERC20Address != address(0), "ERC20_ADDRESS_NOT_SET");
            IERC20_PDN(tmpERC20Address).deleteVest(_voteFor);
        }
        return true;
    }

    /*
    * @dev: This function allows us to reach the length of the multisig itself
    */

    function getMultiSigLength() public view returns(uint){
        return multiSigLength;
    }

    /*
    * @dev: This function allows us to reach if an address is multidsig or not
    */

    function getIsMultiSigAddress(address _address) public view returns(bool){
        return multiSigDAO[_address];
    }

    /*
    * @dev: This function allows us to reach the vote that an address did for a specific poll
    */

    function getVoterVote(address _voter, uint _pollID) public view returns(uint){
        return multiSigPoll[_pollID].vote[_voter];
    }

    /*
    * @dev: This function allows us to reach the poll metadata: pollType, pollBlockStart, voteReceiverAddress, amountApprovedVoteReceiver
    */

    function getPollMetaData(uint _pollID) public view returns(uint, uint, address, uint){
        return (multiSigPoll[_pollID].pollType, multiSigPoll[_pollID].pollBlockStart, multiSigPoll[_pollID].voteReceiverAddress, multiSigPoll[_pollID].amountApprovedVoteReceiver);
    }

    /*
    * @dev: This function allows us to reach the number of blocks that a poll needs to be expired
    */

    function getExpirationBlockTime(uint _pollID) public view returns(uint){
        return N_BLOCK_WEEK.sub(block.number.sub(multiSigPoll[_pollID].pollBlockStart));
    }

    /*
    * @dev: This function allows us to reach the list of active polls
    */

    function getListOfActivePoll() public view returns(uint[] memory){
        uint refPollIndex = indexPoll;
        uint countActive = uint(0);
        bool[] memory activePolls = new bool[](uint(refPollIndex));
        for(uint index = uint(0); index < refPollIndex; index++){
            if(multiSigPoll[index.add(1)].pollType != uint(pollTypeMetaData.NULL)){
                if((block.number).sub(multiSigPoll[index.add(1)].pollBlockStart) <= N_BLOCK_WEEK){
                    activePolls[index] = true;
                    countActive = countActive.add(1);
                } 
            }
        }
        uint[] memory resultActivePoll = new uint[](uint(countActive));
        uint tmpIndex = uint(0);
        for(uint index = uint(0); index < refPollIndex; index++){
            if(activePolls[index]){
                resultActivePoll[tmpIndex] = index.add(1);
                tmpIndex = tmpIndex.add(1);
            }
        }
        return resultActivePoll;
    }

    /*
    * @dev: This function allows us to set the ERC20 Address of the PDN token
    *
    * Requirements:
    *       - Only multisig address can run this function
    */

    function setERC20Address(address _ERC20Address) public returns(bool){
        require(getIsMultiSigAddress(msg.sender), "REQUIRE_MULTISIG_ADDRESS");
        ERC20Address = _ERC20Address;
        return true;
    }

}