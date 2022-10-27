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
import '../../interfaces/IMultiSig.sol';
import './MultiSig.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';

contract AccessibilitySettings is Initializable {

    using SafeMathUpgradeable for uint256;

    // Mapping to identify the accessibility of a user group for a specific function inside a smart contract
    mapping(address => mapping(bytes4 => mapping(uint => bool))) Accessibility; //SMART CONTRACT => SIGNATURE => USER GROUP => ACCESSIBILITY
    // Mapping to identify for each smart contract which group an address is
    mapping(address => mapping(address => uint)) AccessibilityGroup; // SMART CONTRACT => USER => USER GROUP

    event ChangeUserGroupEvent(address indexed caller, address indexed user, uint newGroup);
    event ChangeGroupAccessibilityEvent(address indexed smartContractReference, bytes4 indexed functionSignature, uint groupReference, bool Accessibility);
    event freezeEvent(address multisigAddress, bool freeze);
    event setMultisigEvent(address owner, address multisigAddress);

    address public DAOCreator;
    address public multiSigRefAddress;

    bool public isFrozen;
    bool multiSigInitilized;

    /*
    * @dev: Layer of security that lock the smart contract in case of
    *       suspicious activities. To unlock it we need a multisig function call.
    *
    * Requirements:
    *       - { isFrozen } has to be true to be able to run the function
    */

    modifier securityFreeze(){
        require(isFrozen == false, "THIS_FUNCTION_IS_FROZEN_FOR_SECURITY");
        _;
    }

    /*
    * @dev: Layer of security that enable then function only for who is inside the multisig address list
    *
    * Requirements:
    *       - who call the function has to be part of the multisig list
    */

    modifier multiSigSecurityAccess {
        require(IMultiSig(multiSigRefAddress).getIsMultiSigAddress(msg.sender), "NOT_ENABLED_TO_RUN_THIS_FUNCTION");
        _;
    }

    /*
    * @dev: who initialize is the owner of the smart contract
    *
    * Requirements:
    *       - No requirements needed
    */

    function initialize () public initializer {
        DAOCreator = msg.sender;    
    }

    /*
    * @dev: who has initialized the smart contract can run this function
    *
    * Requirements:
    *       - Who can run the function has to be the same address of who has initialized the smart contract
    */

    modifier isSuperAdmin(){
        require(DAOCreator == msg.sender, "ONLY_SUPERADMIN_CAN_RUN_THIS");
        _;
    }

    /*
    * @dev: This function allows a smart contract to enable a function for a specific user group.
    *       The function is open cause it is address based, it means that this function has logic value
    *       only for who will use it (in our case another smart contract). This will allow to who will
    *       call this function such an interface to receive a true/false value for a specific combination
    *       of function signature and user group. This last one by default is set 'open', meanwhile smart contracts
    *       can set indipendently user roles and group by themselves
    *
    * Requirements:
    *       - { functionSignatureList } and { userGroupList } has to be length greater than 0
    *
    * Events:
    *       - ChangeGroupAccessibilityEvent for each combination of function signature and userGroup
    */

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

    /*
    * @dev: This function allows a smart contract to disable a function for a specific user group.
    *       The function is open cause it is address based, it means that this function has logic value
    *       only for who will use it (in our case another smart contract). This will allow to who will
    *       call this function such an interface to receive a true/false value for a specific combination
    *       of function signature and user group. This last one by default is set 'open', meanwhile smart contracts
    *       can set indipendently user roles and group by themselves
    *
    * Requirements:
    *       - { functionSignatureList } and { userGroupList } has to be length greater than 0
    *
    * Events:
    *       - ChangeGroupAccessibilityEvent for each combination of function signature and userGroup
    */

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

    /*
    * @dev: This function allows to set roles for a list of addresses (A) giving them a 1 : 1 correlation with
    *       a userGroup List (G): A1 => G1, A2 => G2, ...
    *
    * Requirements:
    *       - Both list { userAddress } and { userGroup } has to be the same length
    *       - Every single address can not be equal to null address
    *       - DAO Creator address can not be set to a role not equal to admin
    *
    * Events:
    *       - ChangeUserGroupEvent for each assignment userAddress => UserGroup
    */

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

    /*
    * @dev: unction that allows to freeze all DAO
    *
    * Requirements:
    *       - The function has not be frozen
    *       - The function can be run only from multisig smart contract
    *
    * Events:
    *       - freezeEvent
    */

    function freeze() public securityFreeze multiSigSecurityAccess returns(bool){
        isFrozen = true;
        emit freezeEvent(msg.sender, true);
        return true;
    }

    function changeDAOCreator(address _newDAOCreator) external returns(bool){
        require(multiSigRefAddress == msg.sender, "ONLY_MULTI_SIG_ADDRESS_CAN_RUN_THIS_FUNCTION");
        DAOCreator = _newDAOCreator;
        return true;
    }

    /*
    * @dev: Fuction that allow to restore the frozen state of the DAO.
    *
    * Requirements:
    *       - The function can be run only from multi sig smart contract address
    *
    * Events:
    *       - freezeEvent
    */

    function restoreIsFrozen() external returns(bool){
        require(multiSigRefAddress == msg.sender, "ONLY_MULTI_SIGq_ADDRESS_CAN_RUN_THIS_FUNCTION");
        isFrozen = false;
        emit freezeEvent(msg.sender, true);
        return true;
    }

    /*
    * @dev: Fuction that allow to set the multisig smart contract address
    *
    * Requirements:
    *       - The function can be run only from who is the owner the this smart contract
    *       - This function can be run only one time
    * Events:
    *       - freezeEvent
    */

    function multiSigInitialize(address _multiSigRefAddress) public isSuperAdmin returns(bool){
        require(!multiSigInitilized, "MULTISIG_ALREADY_INITIALIZED");
        multiSigRefAddress = _multiSigRefAddress;
        multiSigInitilized = true;
        emit setMultisigEvent(msg.sender, _multiSigRefAddress);
        return true;
    }

    /*
    * @dev: Get Accessibility Metadata for a specific { functionSignature } and { userAddress } based on
    *       the smart contract that will call the function
    */

    function getAccessibility(bytes4 _functionSignature, address _userAddress) public view returns(bool){
        return Accessibility[msg.sender][_functionSignature][AccessibilityGroup[msg.sender][_userAddress]];
    }

    /*
    * @dev: Get User Group from { userAddress }
    */

    function getUserGroup(address _userAddress) public view returns(uint){
        return AccessibilityGroup[msg.sender][_userAddress];
    }

    /*
    * @dev: Get Dao Creator
    */

    function getDAOCreator() public view returns(address){
        return DAOCreator;
    }

    /*
    * @dev: Get { isFrozen }
    */

    function getIsFrozen() public view returns(bool){
        return isFrozen;
    }

    /*
    * @dev: Get Multisig smart contract address
    */

    function getMultiSigRefAddress() public view returns(address){
        return multiSigRefAddress;
    }
}
