// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './structures/MetaDataStructure.sol';
import '../shared/Signatures.sol';
import '../interfaces/IAccessibilitySettings.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol';

contract Accountability is Signatures, MetaDataStructure, ERC20Upgradeable{
 
    using SafeMathUpgradeable for uint256;

    address accessibilitySettingsAddress;
    address owner;

    bytes4[] functionSignatures;

    mapping(address => mapping(address => uint)) accountability; // TOKEN -> ADDRESS -> BALANCE

    modifier onlyOwner(){
        require(owner == msg.sender, "ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
        _;
    }

    modifier checkAccessibility(bytes4 _signature){
        IAccessibilitySettings IAS = IAccessibilitySettings(accessibilitySettingsAddress); 
        require(IAS.getAccessibility(_signature, msg.sender), "FUNCTION_NOT_ALLOWED_TO_RUN_FROM_THIS_SMARTCONTRACT");
        _;
    }

    constructor(address _accessibilitySettingsAddress) {

        accessibilitySettingsAddress = _accessibilitySettingsAddress;
        owner = msg.sender;

        // ------------------------------------------------------------ List of function signatures

        bytes4[] memory signatures;
        uint[] memory userGroupAdminArray;

        signatures[0] = FUNCTION_ADDBALANCE_SIGNATURE;
        signatures[1] = FUNCTION_SUBBALANCE_SIGNATURE;
        signatures[2] = FUNCTION_SETUSERROLE_SIGNATURE;

        userGroupAdminArray[0] = uint(UserGroup.ADMIN);

        functionSignatures = signatures;

        IAccessibilitySettings IAS = IAccessibilitySettings(accessibilitySettingsAddress); 
        IAS.setUserRole(msg.sender, uint(UserGroup.ADMIN));     // Who create the contract is admin
        IAS.setUserRole(address(this), uint(UserGroup.ADMIN));  // The contract itself is admin too
        IAS.enableSignature(signatures, userGroupAdminArray);
    }

    // ONLY OWNER FUNCTIONS 

    function enableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyOwner returns(bool){
        IAccessibilitySettings IAS = IAccessibilitySettings(accessibilitySettingsAddress); 
        IAS.enableSignature(_signatures, _userGroup);
        return true;
    }

    function disableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyOwner returns(bool){
        IAccessibilitySettings IAS = IAccessibilitySettings(accessibilitySettingsAddress); 
        IAS.disableSignature(_signatures, _userGroup);
        return true;
    }

    // PUBLIC FUNCTIONS WITH CHECK ACCESSIBILITY

    function setUserRole(address _userAddress, uint _userGroup) checkAccessibility(FUNCTION_SETUSERROLE_SIGNATURE) public returns(bool){
        require(_userAddress != address(0), "CANT_SET_NULL_ADDRESS");
        IAccessibilitySettings IAS = IAccessibilitySettings(accessibilitySettingsAddress); 
        IAS.setUserRole(_userAddress,_userGroup);
        return true;
    }

    function addBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_ADDBALANCE_SIGNATURE) returns(bool){
        require(_user != address(0), "CANT_ADD_BALANCE_ON_NULL_ADDRESS");
        require(_token != address(0), "TOKEN_CANT_BE_NULL_ADDRESS");
        accountability[_token][_user] = accountability[_token][_user].add(_amount);
        return true;
    }

    function subBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_SUBBALANCE_SIGNATURE) returns(bool){
        require(_user != address(0), "CANT_ADD_BALANCE_ON_NULL_ADDRESS");
        require(_token != address(0), "TOKEN_CANT_BE_NULL_ADDRESS");
        accountability[_token][_user] = accountability[_token][_user].sub(_amount);
        return true;
    }

    function getFunctionSignatures() public view returns(bytes4[] memory){
        return functionSignatures;
    }

    function getBalance(address _token, address _user) public view returns(uint){
        return accountability[_token][_user];
    }

    // NEED TO APPROVE THIS SMART CONTRACT SUCH A SPENDER FROM THE OWNER OF THE ERC20
    function approveERC20Distribution(address _token, uint _amount) public returns(bool){
        require(_token != address(0), "CANT_REFER_TO_NULL_ADDRESS");
        require(_amount > 0, "CANT_APPROVE_NULL_AMOUNT");
        IERC20Upgradeable IERC20 = IERC20Upgradeable(_token);
        IERC20.approve(msg.sender, _amount);
        require(IERC20.allowance(msg.sender, address(this)) > _amount, "INSUFFICIENT_ALLOWANCE"); //to check
        //require(IERC20.balanceOf(msg.sender)>= _amount, "INSUFFICIENT_FUNDS");
        return true;
    }

    //To run this function we need to to allow this smartcontract to the IERC20
    function redeemERC20(address _token) public returns(bool){
        require(_token != address(0), "CANT_REFER_TO_NULL_ADDRESS");
        uint userBalance = getBalance(_token, msg.sender);
        IERC20Upgradeable IERC20 = IERC20Upgradeable(_token);
        IERC20.transferFrom(address(this), msg.sender, userBalance);
        return true;
    }


}