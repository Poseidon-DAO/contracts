// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '../structures/MetaDataStructure.sol';
import '../../shared/Signatures.sol';
import '../../interfaces/IAccessibilitySettings.sol';
import '../../standard-upgradable-erc/ERC20-Upgradable/ERC20-Upgradable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Accountability is Signatures, MetaDataStructure, Initializable {
 
    using SafeMathUpgradeable for uint256;

    address owner;
    IAccessibilitySettings IAS;

    bytes4[] functionSignatures;

    mapping(address => mapping(address => uint)) accountability; // TOKEN -> ADDRESS -> BALANCE
    mapping(address => IERC20Upgradeable) tokenListManagement; // TOKEN => INTERFACE
    mapping(address => address) tokenReferreal; //TOKEN => ADDRESS (user reference that is "owner" of the token)

    modifier onlyOwner(){
        require(owner == msg.sender, "ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
        _;
    }

    modifier checkAccessibility(bytes4 _signature, bool _expectedValue){
        require(IAS.getAccessibility(_signature, msg.sender) == _expectedValue, "FUNCTION_NOT_ALLOWED_TO_RUN_FROM_THIS_SMARTCONTRACT");
        _;
    }

    constructor(address _accessibilitySettingsAddress) {
        require(_accessibilitySettingsAddress != address(0), "CANT_SET_TO_NULL_ADDRESS");
        IAS = IAccessibilitySettings(_accessibilitySettingsAddress); 
        IAS.setUserRole(msg.sender, uint(UserGroup.ADMIN));     // Who create the contract is admin
        IAS.setUserRole(address(this), uint(UserGroup.ADMIN));  // The contract itself is admin too
      
        owner = msg.sender;

        // ------------------------------------------------------------ List of function signatures

        bytes4[] memory signatures;
        uint[] memory userGroupAdminArray;

        signatures[0] = FUNCTION_ADDBALANCE_SIGNATURE;
        signatures[1] = FUNCTION_SUBBALANCE_SIGNATURE;
        signatures[2] = FUNCTION_SETUSERROLE_SIGNATURE;

        userGroupAdminArray[0] = uint(UserGroup.ADMIN);

        functionSignatures = signatures;

        IAS.enableSignature(signatures, userGroupAdminArray);
    }

    // ONLY OWNER FUNCTIONS 

    function changeAccessibilitySettings(address _accessibilitySettingsAddress) public onlyOwner returns(bool){
        require(_accessibilitySettingsAddress != address(0), "CANT_SET_TO_NULL_ADDRESS");
        IAS = IAccessibilitySettings(_accessibilitySettingsAddress);
        return true;
    }

    function enableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyOwner returns(bool){
        IAS.enableSignature(_signatures, _userGroup);
        return true;
    }

    function disableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyOwner returns(bool){
        IAS.disableSignature(_signatures, _userGroup);
        return true;
    }

    // PUBLIC FUNCTIONS WITH CHECK ACCESSIBILITY

    function setUserListRole(address[] memory _userAddress, uint[] memory _userGroup) checkAccessibility(FUNCTION_SETUSERROLE_SIGNATURE, true) public returns(bool){
        require(_userAddress.length == _userGroup.length, "DATA_LENGTH_DISMATCH");
        IAS.setUserListRole(_userAddress,_userGroup);
        return true;
    }

    function addBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_ADDBALANCE_SIGNATURE, true) returns(bool){
        require(_user != address(0), "CANT_ADD_BALANCE_ON_NULL_ADDRESS");
        require(_token != address(0), "TOKEN_CANT_BE_NULL_ADDRESS");
        accountability[_token][_user] = accountability[_token][_user].add(_amount);
        return true;
    }

    function subBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_SUBBALANCE_SIGNATURE, true) returns(bool){
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
        require(tokenReferreal[_token] == msg.sender, "REFEREE_DISMATCH");
        IERC20Upgradeable IERC20 = tokenListManagement[_token]; // load upgradeable interface
        IERC20.approve(address(this), _amount);
        return true;
    }

    //To run this function we need to to allow this smartcontract to the IERC20
    function redeemERC20(address _token) public returns(bool){
        require(_token != address(0), "CANT_REFER_TO_NULL_ADDRESS");
        uint userBalance = getBalance(_token, msg.sender);
        require(userBalance > 0, "INSUFFICIENT_BALANCE");
        accountability[_token][msg.sender] = uint(0);
        IERC20Upgradeable IERC20 = tokenListManagement[_token];
        IERC20.transferFrom(address(this), msg.sender, userBalance);
        return true;
    }

    function redeemListOfERC20(address[] memory _tokenList) public returns(bool){
        IERC20Upgradeable IERC20;
        uint userBalance;
        for(uint index; index < _tokenList.length; index++){
            userBalance = getBalance(_tokenList[index], msg.sender);
            if(userBalance > 0){
                accountability[_tokenList[index]][msg.sender] = uint(0);
                IERC20 = tokenListManagement[_tokenList[index]];
                IERC20.transferFrom(address(this), msg.sender, userBalance);
            }
        }
        return true;
    }

    // need to test it - check accessibility!!!!!!
    function createUpgradeableERC20Token(string memory _tokenName, string memory _tokenSymbol, uint _totalSupply, address _referree) public initializer returns(address){
        ERC20U tokenUpgradeable = new ERC20U();
        tokenUpgradeable.initialize(_tokenName, _tokenSymbol);
        tokenUpgradeable.mint(address(this), _totalSupply, 18);
        tokenReferreal[address(tokenUpgradeable)] = _referree;
        initializeUpgradableToken(address(tokenUpgradeable));
        return address(tokenUpgradeable);
    }

    // It should upgrade the ERC20 Upgradable token -> need to test it - check accessibility!!!!!!
    function initializeUpgradableToken(address _tokenAddress) public initializer {
        tokenListManagement[_tokenAddress] = IERC20Upgradeable(_tokenAddress);
    }
}