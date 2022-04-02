// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

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

    address owner;
    IAccessibilitySettings IAS;

    bytes4[] functionSignatures;

    mapping(address => mapping(address => uint)) accountability; // TOKEN -> ADDRESS -> BALANCE
    mapping(address => IERC20Upgradeable) tokenListManagement; // TOKEN => INTERFACE
    mapping(address => address) tokenReferreal; //TOKEN => ADDRESS (user reference that is "owner" of the token)

    event ChangeAccessibilitySettingsAddressEvent(address owner, address accessibilitySettingsAddress);
    event ChangeBalanceEvent(address indexed caller, address indexed token, address indexed user, uint oldBalance, uint newBalance);
    event ApproveDistributionEvent(address indexed referee, address indexed token, uint amount);
    event RedeemEvent(address indexed caller, address indexed token, uint redeemAmount);
    event CreateERC20UpgradeableEvent(address caller, string tokenName, string tokenSymbol, uint totalSupply, uint8 decimals, address referee, address tokenUpgradeableAddress);

    enum IndexSignaturesFriendlyName {
        FUNCTION_ADDBALANCE_SIGNATURE,
        FUNCTION_SUBBALANCE_SIGNATURE,
        FUNCTION_SETUSERROLE_SIGNATURE,
        FUNCTION_APPROVEERC20DISTR_SIGNATURE
    }

    modifier onlyOwner(){
        require(owner == msg.sender, "ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
        _;
    }

    modifier checkAccessibility(bytes4 _signature, bool _expectedValue){
        require(IAS.getAccessibility(_signature, msg.sender) == _expectedValue, "FUNCTION_NOT_ALLOWED_TO_RUN_FROM_THIS_SMARTCONTRACT");
        _;
    }

    constructor(address _accessibilitySettingsAddress, address _DAOCreator) {
        require(_accessibilitySettingsAddress != address(0), "CANT_SET_TO_NULL_ADDRESS");
        IAS = IAccessibilitySettings(_accessibilitySettingsAddress); 
        require(IAS.setUserRole(_DAOCreator, uint(UserGroup.ADMIN)), "COULDNT_SET_SENDER_SUCH_ADMIN");     // Who create the contract is admin
        require(IAS.setUserRole(address(this), uint(UserGroup.ADMIN)), "COULDNT_SET_SMARTCONTRACT_SUCH_ADMIN");  // The contract itself is admin too
      
        owner = _DAOCreator;

        // ------------------------------------------------------------ List of function signatures

        bytes4[] memory signatures = new bytes4[](uint(3));         // Number of signatures
        uint[] memory userGroupAdminArray = new uint[](uint(1));    // Number of Group Admin

        signatures[uint(IndexSignaturesFriendlyName.FUNCTION_ADDBALANCE_SIGNATURE)] = FUNCTION_ADDBALANCE_SIGNATURE;
        signatures[uint(IndexSignaturesFriendlyName.FUNCTION_SUBBALANCE_SIGNATURE)] = FUNCTION_SUBBALANCE_SIGNATURE;
        signatures[uint(IndexSignaturesFriendlyName.FUNCTION_SETUSERROLE_SIGNATURE)] = FUNCTION_SETUSERROLE_SIGNATURE;
        signatures[uint(IndexSignaturesFriendlyName.FUNCTION_APPROVEERC20DISTR_SIGNATURE)] = FUNCTION_APPROVEERC20DISTR_SIGNATURE;

        userGroupAdminArray[0] = uint(UserGroup.ADMIN);

        functionSignatures = signatures;

        require(IAS.enableSignature(signatures, userGroupAdminArray),"COULDNT_SET_PREDEFINED_SIGNATURES_TO_ADMIN");          
    }

    // ONLY OWNER FUNCTIONS 

    function changeAccessibilitySettings(address _accessibilitySettingsAddress) public onlyOwner returns(bool){
        require(_accessibilitySettingsAddress != address(0), "CANT_SET_TO_NULL_ADDRESS");
        IAS = IAccessibilitySettings(_accessibilitySettingsAddress);
        emit ChangeAccessibilitySettingsAddressEvent(msg.sender, _accessibilitySettingsAddress);
        return true;
    }

    function enableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyOwner returns(bool){
        IAS.enableSignature(_signatures, _userGroup);
        //emit on Interface
        return true;
    }

    function disableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyOwner returns(bool){
        IAS.disableSignature(_signatures, _userGroup);
        //emit on Interface
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
        IAS.setUserListRole(_userAddress,_userGroup);
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
    function approveERC20Distribution(address _token, uint _amount) checkAccessibility(FUNCTION_APPROVEERC20DISTR_SIGNATURE, true) public returns(bool){
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
        tokenListManagement[_token].transferFrom(address(this), msg.sender, userBalance);
        emit ChangeBalanceEvent(msg.sender, _token, msg.sender, userBalance, uint(0));
        emit RedeemEvent(msg.sender, _token, userBalance);
        return true;
    }

    function redeemListOfERC20(address[] memory _tokenList) public returns(bool){
        uint userBalance;
        address token;
        for(uint index; index < _tokenList.length; index++){
            token = _tokenList[index];
            userBalance = getBalance(token, msg.sender);
            if(userBalance > 0){
                accountability[token][msg.sender] = uint(0);
                tokenListManagement[token].transferFrom(address(this), msg.sender, userBalance);
                emit ChangeBalanceEvent(msg.sender, token, msg.sender, userBalance, uint(0));
                emit RedeemEvent(msg.sender, token, userBalance);
            }
        }
        return true;
    }

    function createUpgradeableERC20Token(string memory _tokenName, string memory _tokenSymbol, uint _totalSupply, address _referree) public initializer returns(bool){
        DynamicERC20Upgradeable tokenUpgradeable = new DynamicERC20Upgradeable();
        address tokenAddress = address(tokenUpgradeable);
        tokenUpgradeable.initialize(_tokenName, _tokenSymbol);
        tokenUpgradeable.mint(address(this), _totalSupply, uint8(18));
        tokenReferreal[tokenAddress] = _referree;
        emit CreateERC20UpgradeableEvent(msg.sender, _tokenName, _tokenSymbol, _totalSupply, uint8(18), _referree, tokenAddress);
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
        require(address(this) == IDERC20U.getOwner(), "OWNER_DISMATCH");
        IDERC20U.burn(_amount * (10 ** 18));
        return true;
    }

    // It should upgrade the ERC20 Upgradable token -> need to test it - check accessibility!!!!!! ->It's upgradeable for each token
    function initializeUpgradableToken(address _tokenAddress) public initializer returns(bool){
        tokenListManagement[_tokenAddress] = IERC20Upgradeable(_tokenAddress);
        return true;
    }

    function getOwnUserGroupForThisSmartContract() public view returns(uint){
        return IAS.getUserGroup(msg.sender);
    }
}