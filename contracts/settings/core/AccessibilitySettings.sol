// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;


import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";

contract AccessibilitySettings{

    using SafeMathUpgradeable for uint256;

    uint N_BLOCK_DAY = uint(5760);
    uint N_BLOCK_WEEK = uint(7).mul(N_BLOCK_DAY);

    mapping(address => mapping(bytes4 => mapping(uint => bool))) Accessibility; //SMART CONTRACT => SIGNATURE => USER GROUP => ACCESSIBILITY
    mapping(address => mapping(address => uint)) AccessibilityGroup; // SMART CONTRACT => USER => USER GROUP

    // In another way: SMART CONTRACT => SIGNATURE => (SMART CONTRACT => USER => USER GROUP) => ACCESSIBILITY

    event ChangeUserGroupEvent(address indexed caller, address indexed user, uint newGroup);
    event ChangeGroupAccessibilityEvent(address indexed smartContractReference, bytes4 indexed functionSignature, uint groupReference, bool Accessibility);
    event NewMultisigPollEvent(address indexed creator, uint pollIndex, uint pollType);
    event VoteMultisigPollEvent(address indexed voter, uint pollIndex, address voteFor);
    event ChangeStatementMultisigPollEvent(address voted, uint pollType);

    address DAOCreator;
    address DAOSetup;
    mapping(address => bool) multiSig;
    uint multiSigLength;
    mapping(uint => multiSigPollStruct) multiSigPoll;

    uint indexPoll;

    struct multiSigPollStruct {
        uint pollType;
        mapping(address => bool) hasVoted;
        mapping(address => uint) voteReceived;
        uint pollBlockStart;
    }

    enum pollTypeMetaData{
        NULL,
        CHANGE_CREATOR,
        DELETE_ADDRESS_ON_MULTISIG_LIST,
        ADD_ADDRESS_ON_MULTISIG_LIST
    }

    constructor (address _DAOCreator, address[] memory _multiSigAddresses){
        indexPoll = 0;
        require(_DAOCreator != address(0), "CANT_SET_NULL_ADDRESS");
        bool DAOCreatorIsInMultiSig = false;
        require(_multiSigAddresses.length >= 5, "MULTISIG_NEEDS_MIN_5_ADDRESSES");
        for(uint index = 0; index < _multiSigAddresses.length; index++){
            require(_multiSigAddresses[index] != address(0), "CANT_SET_NULL_ADDRESS");
            multiSig[_multiSigAddresses[index]] = true;
            if(_multiSigAddresses[index] == _DAOCreator){
                DAOCreatorIsInMultiSig = true;
            }
        }
        require(DAOCreatorIsInMultiSig,"DAO_CREATOR_IS_NOT_IN_MULTISIG_LIST");
        DAOCreator = _DAOCreator;    
        DAOSetup = msg.sender;    
    }

    modifier isSuperAdmin(){
        require(DAOCreator == msg.sender, "ONLY_SUPERADMIN_CAN_RUN_THIS");
        _;
    }

    function createMultiSigPoll(uint _pollTypeID) public returns(bool){
        require(multiSig[msg.sender], "NOT_ABLE_TO_CREATE_A_MULTISIG_POLL");
        uint refPollIndex = indexPoll.add(1);
        indexPoll = refPollIndex;
        multiSigPoll[refPollIndex].pollType = _pollTypeID;
        multiSigPoll[refPollIndex].pollBlockStart = block.number;
        emit NewMultisigPollEvent(msg.sender, refPollIndex, _pollTypeID);
        return true;
    }


    function voteMultiSigPoll(uint _pollIndex, address _voteFor) public returns(bool){
        require(multiSig[msg.sender], "NOT_ABLE_TO_CREATE_A_MULTISIG_POLL");
        uint refPollIndex = indexPoll;
        require((block.number).sub(multiSigPoll[refPollIndex].pollBlockStart) <= N_BLOCK_WEEK, "MULTISIG_POLL_EXPIRED");
        bool hasVoted = multiSigPoll[refPollIndex].hasVoted[msg.sender];
        require(!hasVoted, "ADDRESS_HAS_ALREADY_VOTED");
        uint voteFor = multiSigPoll[refPollIndex].voteReceived[_voteFor];
        multiSigPoll[refPollIndex].voteReceived[_voteFor] = voteFor.add(1);
        if(voteFor > multiSigLength.div(2)){ // 3/5, 5/9 or whatever
            runMultiSigFunction(_pollIndex, _voteFor);
            emit ChangeStatementMultisigPollEvent(_voteFor, multiSigPoll[refPollIndex].pollType);
        }
        emit VoteMultisigPollEvent(msg.sender, _pollIndex, _voteFor);
        return true;
    }

    function runMultiSigFunction(uint _functionID, address _voteFor) private returns(bool){
        if(_functionID == uint(pollTypeMetaData.CHANGE_CREATOR)){
            DAOCreator = _voteFor;
        }
        if(_functionID == uint(pollTypeMetaData.DELETE_ADDRESS_ON_MULTISIG_LIST)){
            multiSigLength = multiSigLength.sub(1);
            multiSig[_voteFor] = true;
        }        
        if(_functionID == uint(pollTypeMetaData.ADD_ADDRESS_ON_MULTISIG_LIST)){
            multiSigLength = multiSigLength.add(1);
            multiSig[_voteFor] = true;
        }
        return true;
    }
    function enableSignature(bytes4[] memory _functionSignatureList, uint[] memory _userGroupList) public returns(bool){
        require(_userGroupList.length > 0, "NO_USER_ROLES_DEFINED");
        require(_functionSignatureList.length > 0, "NO_SIGNATURES_DEFINED");
        for(uint signIndex = 0; signIndex < _functionSignatureList.length; signIndex++){
            for(uint index = 0; index < _userGroupList.length; index++){
                Accessibility[msg.sender][_functionSignatureList[signIndex]][_userGroupList[index]] = true;
                emit ChangeGroupAccessibilityEvent(msg.sender, _functionSignatureList[signIndex], _userGroupList[index], true);
            }
        }
        return true;
    }

    function disableSignature(bytes4[] memory _functionSignatureList, uint[] memory _userGroupList) public returns(bool){
        require(_userGroupList.length > 0, "NO_USER_ROLES_DEFINED");
        require(_functionSignatureList.length > 0, "NO_SIGNATURES_DEFINED");
        for(uint signIndex = 0; signIndex < _functionSignatureList.length; signIndex++){
            for(uint index = 0; index < _userGroupList.length; index++){
                require(_userGroupList[index] != uint(1), "CANNOT_DISABLE_ADMIN_FUNCTIONS");
                Accessibility[msg.sender][_functionSignatureList[signIndex]][_userGroupList[index]] = false;
                emit ChangeGroupAccessibilityEvent(msg.sender, _functionSignatureList[signIndex], _userGroupList[index], false);
            }
        }
        return true;
    }

    function setUserListRole(address[] memory _userAddress, uint[] memory _userGroup) public returns(bool){
        require(_userAddress.length == _userGroup.length, "DATA_LENGTH_DISMATCH");
        for(uint index = 0; index < _userAddress.length; index++){
            require(_userAddress[index] != address(0), "CANT_SET_NULL_ADDRESS");
            require(DAOCreator != _userAddress[index], "CANNOT_CHANGE_USER_ROLE_TO_DAO_CREATOR");
            AccessibilityGroup[msg.sender][_userAddress[index]] = _userGroup[index];
            emit ChangeUserGroupEvent(msg.sender, _userAddress[index], _userGroup[index]);
        }
        return true;
    }

    function getAccessibility(bytes4 _functionSignature, address _userAddress) public view returns(bool){
        return Accessibility[msg.sender][_functionSignature][AccessibilityGroup[msg.sender][_userAddress]];
    }

    function getUserGroup(address _userAddress) public view returns(uint){
        return AccessibilityGroup[msg.sender][_userAddress];
    }

    function getDAOCreator() public view returns(address){
        return DAOCreator;
    }
}
