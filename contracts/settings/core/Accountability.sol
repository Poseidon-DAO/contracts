// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import '../structures/MetaDataStructure.sol';
import '../../shared/Signatures.sol';
import '../../interfaces/IAccessibilitySettings.sol';
import '../../interfaces/IDynamicERC20Upgradeable.sol';
import '../../interfaces/IDAOSetup.sol';
import '../../standard-upgradeable-erc/ERC20-Upgradeable/DynamicERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract Accountability is Signatures, MetaDataStructure, Initializable {
 
    using SafeMathUpgradeable for uint256;

    address DAOCreator;
    address accessibilitySettingsAddress;

    bytes4[] functionSignatures;

    mapping(address => mapping(address => uint)) accountability; // TOKEN -> ADDRESS -> BALANCE
    mapping(address => bool) tokenListManagement; // TOKEN => ISPRESENT
    mapping(address => address) tokenReferreal; //TOKEN => ADDRESS (user reference that is "owner" of the token)

    event ChangeAccessibilitySettingsAddressEvent(address owner, address accessibilitySettingsAddress);
    event ChangeBalanceEvent(address indexed caller, address indexed token, address indexed user, uint oldBalance, uint newBalance);
    event ApproveDistributionEvent(address indexed referee, address indexed token, uint amount);
    event RedeemEvent(address indexed caller, address indexed token, uint redeemAmount);
    event CreateERC20UpgradeableEvent(address caller, string tokenName, string tokenSymbol, uint totalSupply, uint8 decimals, address referee, address tokenUpgradeableAddress);

    modifier onlyOwner(){
        require(DAOCreator == msg.sender, "ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
        _;
    }

    modifier checkAccessibility(bytes4 _signature, bool _expectedValue){
        require(IAccessibilitySettings(accessibilitySettingsAddress).getAccessibility(_signature, msg.sender) == _expectedValue, "FUNCTION_NOT_ALLOWED_TO_RUN_FROM_THIS_SMARTCONTRACT");
        _;
    }

    constructor(address _accessibilitySettingsAddress, address _DAOCreator) {
        require(_accessibilitySettingsAddress != address(0), "CANT_SET_NULL_ADDRESS");
        require(_DAOCreator != address(0), "CANT_SET_NULL_ADDRESS");
        accessibilitySettingsAddress = _accessibilitySettingsAddress;
        IAccessibilitySettings IAS = IAccessibilitySettings(accessibilitySettingsAddress);
        require(IAS.setUserRole(_DAOCreator, uint(UserGroup.ADMIN)), "COULDNT_SET_SENDER_SUCH_ADMIN");     // Who create the contract is admin
        require(IAS.setUserRole(address(this), uint(UserGroup.ADMIN)), "COULDNT_SET_SMARTCONTRACT_SUCH_ADMIN");  // The contract itself is admin too
      
        DAOCreator = _DAOCreator;

        // ------------------------------------------------------------ List of function signatures

        bytes4[] memory signatures = new bytes4[](uint(5));         // Number of signatures
        uint[] memory userGroupAdminArray = new uint[](uint(1));    // Number of Group Admin

        signatures[0] = FUNCTION_ADDBALANCE_SIGNATURE;
        signatures[1] = FUNCTION_SUBBALANCE_SIGNATURE;
        signatures[2] = FUNCTION_SETUSERROLE_SIGNATURE;
        signatures[3] = FUNCTION_CREATEERC20_SIGNATURE;
        signatures[4] = FUNCTION_APPROVEERC20DISTR_SIGNATURE;

        userGroupAdminArray[0] = uint(UserGroup.ADMIN);

        functionSignatures = signatures;

        require(IAS.enableSignature(signatures, userGroupAdminArray),"COULDNT_SET_PREDEFINED_SIGNATURES_TO_ADMIN");          
    }

    // ONLY OWNER FUNCTIONS 

    function changeAccessibilitySettings(address _accessibilitySettingsAddress) public onlyOwner returns(bool){
        require(_accessibilitySettingsAddress != address(0), "CANT_SET_TO_NULL_ADDRESS");
        accessibilitySettingsAddress = _accessibilitySettingsAddress;
        emit ChangeAccessibilitySettingsAddressEvent(msg.sender, _accessibilitySettingsAddress);
        return true;
    }

    function enableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyOwner returns(bool){
        IAccessibilitySettings(accessibilitySettingsAddress).enableSignature(_signatures, _userGroup);
        return true;
    }

    function disableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyOwner returns(bool){
        IAccessibilitySettings(accessibilitySettingsAddress).disableSignature(_signatures, _userGroup);
        return true;
    }

    // PUBLIC FUNCTIONS WITH CHECK ACCESSIBILITY

    function addBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_ADDBALANCE_SIGNATURE, true) returns(bool){
        require(_user != address(0), "CANT_ADD_BALANCE_ON_NULL_ADDRESS");
        require(_token != address(0), "TOKEN_CANT_BE_NULL_ADDRESS");
        uint oldbalance = accountability[_token][_user];
        uint newBalance = oldbalance.add(_amount);
        accountability[_token][_user] = newBalance;
        emit ChangeBalanceEvent(msg.sender, _token, _user, oldbalance, newBalance);
        return true;
    }

    function subBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_SUBBALANCE_SIGNATURE, true) returns(bool){
        require(_user != address(0), "CANT_ADD_BALANCE_ON_NULL_ADDRESS");
        require(_token != address(0), "TOKEN_CANT_BE_NULL_ADDRESS");
        uint oldbalance = accountability[_token][_user];
        uint newBalance = oldbalance.sub(_amount);
        accountability[_token][_user] = newBalance;
        emit ChangeBalanceEvent(msg.sender, _token, _user, oldbalance, newBalance);
        return true;
    }

    function setUserListRole(address[] memory _userAddress, uint[] memory _userGroup) checkAccessibility(FUNCTION_SETUSERROLE_SIGNATURE, true) public returns(bool){
        require(_userAddress.length == _userGroup.length, "DATA_LENGTH_DISMATCH");
        IAccessibilitySettings(accessibilitySettingsAddress).setUserListRole(_userAddress,_userGroup);
        //emit on Interface
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
        IERC20Upgradeable(_token).approve(address(this), _amount); // load upgradeable interface
        return true;
    }

    function redeemListOfERC20(address[] memory _tokenList) public returns(bool){
        uint userBalance;
        address token;
        bool result;
        result = false;
        IERC20Upgradeable IERC20U;
        for(uint index; index < _tokenList.length; index++){
            token = _tokenList[index];
            userBalance = getBalance(token, msg.sender);
            if(userBalance > 0){
                accountability[token][msg.sender] = uint(0);
                IERC20U = IERC20Upgradeable(token);
                require(IERC20U.balanceOf(address(this)) >= userBalance, "NO SUFFICIENT_FUND_FROM_THE_DAO");
                IERC20U.transferFrom(address(this), msg.sender, userBalance);
                emit ChangeBalanceEvent(msg.sender, token, msg.sender, userBalance, uint(0));
                emit RedeemEvent(msg.sender, token, userBalance);
                result = true;
            }
        }
        require(result, "NO_TOKENS_TO_REDEEM");
        return true;
    }

    function createUpgradeableERC20Token(string memory _tokenName, string memory _tokenSymbol, uint _totalSupply, address _referree) public checkAccessibility(FUNCTION_CREATEERC20_SIGNATURE, true) returns(bool){
        DynamicERC20Upgradeable tokenUpgradeable = new DynamicERC20Upgradeable();
        address tokenAddress = address(tokenUpgradeable);
        tokenUpgradeable.initialize(_tokenName, _tokenSymbol);
        tokenUpgradeable.mint(address(this), _totalSupply, 18);
        tokenReferreal[tokenAddress] = _referree;
        tokenListManagement[tokenAddress] = true;
        emit CreateERC20UpgradeableEvent(msg.sender, _tokenName, _tokenSymbol, _totalSupply, 18, _referree, tokenAddress);
        return true;
    }

    function mintUpgradeableERC20Token(address _token, uint _amount) public returns(bool){
        require(tokenReferreal[_token] == msg.sender, "REFEREE_DISMATCH");
        require(_amount > 0, "INSUFFICIENT_AMOUNT");
        IDynamicERC20Upgradeable IDERC20U = IDynamicERC20Upgradeable(_token);
        require(address(this) == IDERC20U.getOwner(), "OWNER_DISMATCH");
        IDERC20U.mint(address(this), _amount, 18);
        return true;
    }

    function burnUpgradeableERC20Token(address _token, uint _amount) public returns(bool){
        require(_amount > 0, "INSUFFICIENT_AMOUNT");
        IDynamicERC20Upgradeable IDERC20U = IDynamicERC20Upgradeable(_token);
        require(tokenReferreal[_token] == msg.sender, "REFEREE_DISMATCH");
        require(address(this) == IDERC20U.getOwner(), "OWNER_DISMATCH");
        require(IERC20Upgradeable(_token).balanceOf(address(this)) >= _amount, "CANT_BURN_TOKENS_FOR_THIS_HIGH_AMOUNT");
        IDERC20U.burn(_amount);
        return true;
    }

    function getOwnUserGroupForThisSmartContract() public view returns(uint){
        return IAccessibilitySettings(accessibilitySettingsAddress).getUserGroup(msg.sender);
    }

    function getDAOCreator() public view returns(address){
        return DAOCreator;
    }

    function isTokenPresentInsideTheDAO(address _token) public view returns(bool){
        return tokenListManagement[_token];
    }

    function getAccessibility(bytes4 _functionSignature) public view returns(bool){
        return IAccessibilitySettings(accessibilitySettingsAddress).getAccessibility(_functionSignature, msg.sender);
    }
}