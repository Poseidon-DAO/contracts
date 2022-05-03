// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '../../interfaces/IMultiSig.sol';
import './MultiSig.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

contract AccessibilitySettings is Initializable {

    using SafeMathUpgradeable for uint256;

    mapping(address => mapping(bytes4 => mapping(uint => bool))) Accessibility; //SMART CONTRACT => SIGNATURE => USER GROUP => ACCESSIBILITY
    mapping(address => mapping(address => uint)) AccessibilityGroup; // SMART CONTRACT => USER => USER GROUP

    event ChangeUserGroupEvent(address indexed caller, address indexed user, uint newGroup);
    event ChangeGroupAccessibilityEvent(address indexed smartContractReference, bytes4 indexed functionSignature, uint groupReference, bool Accessibility);

    address public DAOCreator;
    address public multiSigRefAddress;

    bool public isFrozen;
    bool multiSigInitilized;

    modifier securityFreeze(){
        require(isFrozen == false, "THIS_FUNCTION_IS_FROZEN_FOR_SECURITY");
        _;
    }

    modifier multiSigSecurityAccess {
        require(IMultiSig(multiSigRefAddress).getIsMultiSigAddress(msg.sender), "NOT_ENABLED_TO_RUN_THIS_FUNCTION");
        _;
    }

    function initialize () public initializer {
        DAOCreator = msg.sender;    
    }


    modifier isSuperAdmin(){
        require(DAOCreator == msg.sender, "ONLY_SUPERADMIN_CAN_RUN_THIS");
        _;
    }

    function enableSignature(bytes4[] memory _functionSignatureList, uint[] memory _userGroupList) public securityFreeze returns(bool){
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

    function disableSignature(bytes4[] memory _functionSignatureList, uint[] memory _userGroupList) public securityFreeze returns(bool){
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

    function setUserListRole(address[] memory _userAddress, uint[] memory _userGroup) public securityFreeze returns(bool){
        require(_userAddress.length == _userGroup.length, "DATA_LENGTH_DISMATCH");
        for(uint index = 0; index < _userAddress.length; index++){
            require(_userAddress[index] != address(0), "CANT_SET_NULL_ADDRESS");
            if(_userGroup[index] != uint(1)){
                require(DAOCreator != _userAddress[index], "CANNOT_CHANGE_USER_ROLE_TO_DAO_CREATOR_TO_NON_ADMIN_GROUP");
            }
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

    function getIsFrozen() public view returns(bool){
        return isFrozen;
    }

    function freeze() public securityFreeze multiSigSecurityAccess returns(bool){
        isFrozen = true;
        return true;
    }

    function changeDAOCreator(address _newDAOCreator) external returns(bool){
        require(multiSigRefAddress == msg.sender, "ONLY_MULTI_SIG_ADDRESS_CAN_RUN_THIS_FUNCTION");
        DAOCreator = _newDAOCreator;
        return true;
    }

    function restoreIsFrozen() external returns(bool){
        require(multiSigRefAddress == msg.sender, "ONLY_MULTI_SIG_ADDRESS_CAN_RUN_THIS_FUNCTION");
        isFrozen = false;
        return true;
    }

    function multiSigInitialize(address _multiSigRefAddress) public returns(bool){
        require(!multiSigInitilized, "MULTISIG_ALREADY_INITIALIZED");
        multiSigRefAddress = _multiSigRefAddress;
        multiSigInitilized = true;
        return true;
    }

    function getMultiSigRefAddress() public view returns(address){
        return multiSigRefAddress;
    }
}
