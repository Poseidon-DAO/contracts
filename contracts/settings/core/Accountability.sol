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

    uint N_BLOCK_DAY = uint(5760);

    address accessibilitySettingsAddress;

    bytes4[] functionSignatures;

    mapping(address => mapping(address => uint)) accountability; // TOKEN -> ADDRESS -> BALANCE
    mapping(address => address) tokenReferreal; //TOKEN => ADDRESS (user reference that is "owner" of the token)
    mapping(address => tokenManagementMetaData) tokenManagement;

    event ChangeAccessibilitySettingsAddressEvent(address owner, address accessibilitySettingsAddress);
    event ChangeBalanceEvent(address indexed caller, address indexed token, address indexed user, uint oldBalance, uint newBalance);
    event ApproveDistributionEvent(address indexed referee, address indexed token, uint amount);
    event RedeemEvent(address indexed caller, address indexed token, uint redeemAmount);
    event CreateERC20UpgradeableEvent(address caller, string tokenName, string tokenSymbol, uint totalSupply, uint8 decimals, address referee, address tokenUpgradeableAddress);
    event SecurityTokenMovements(address indexed caller, address token, uint opID, uint blockNumber, uint amount);

    struct tokenManagementMetaData {
        address tokenReferreal;
        uint lastBlockChange;
        mapping(address => uint) lastBlockUserOp;
    }

    enum opID {
        NONE,
        CREATE,
        BURN,
        MINT,
        APPROVE,
        REDEEM
    }

    modifier onlyDAOCreator(){
        require(IAccessibilitySettings(accessibilitySettingsAddress).getDAOCreator() == msg.sender, "ONLY_DAOCREATOR_CAN_RUN_THIS_FUNCTION");
        _;
    }

    modifier checkAccessibility(bytes4 _signature, bool _expectedValue){
        require(IAccessibilitySettings(accessibilitySettingsAddress).getAccessibility(_signature, msg.sender) == _expectedValue, "FUNCTION_NOT_ALLOWED_TO_RUN_FROM_THIS_SMARTCONTRACT");
        _;
    }

    modifier temporaryLockSecurity(address _token){
        require(getBlocksRemained(_token) > 0, "THIS_FUNCTION_IS_TEMPORARY_LOCKED_FOR_SECURITY");
        _;
    }

    constructor(address _accessibilitySettingsAddress) {

        require(_accessibilitySettingsAddress != address(0), "CANT_SET_NULL_ADDRESS");
        accessibilitySettingsAddress = _accessibilitySettingsAddress;
        IAccessibilitySettings IAS = IAccessibilitySettings(accessibilitySettingsAddress);

        address[] memory adminAddresses = new address[](uint(2));         
        uint[] memory adminAddressesRefGroup = new uint[](uint(2));    

        adminAddresses[0] = IAS.getDAOCreator();
        adminAddresses[1] = address(this);

        adminAddressesRefGroup[0] = uint(UserGroup.ADMIN);
        adminAddressesRefGroup[1] = uint(UserGroup.ADMIN);

        require(IAS.setUserListRole(adminAddresses, adminAddressesRefGroup), "COULDNT_SET_SENDER_SUCH_ADMIN");     // Who create the contract is admin

        // ------------------------------------------------------------ List of function signatures

        bytes4[] memory signatures = new bytes4[](uint(8));         // Number of signatures
        uint[] memory userGroupAdminArray = new uint[](uint(1));    // Number of Group Admin

        signatures[0] = FUNCTION_ADDBALANCE_SIGNATURE;
        signatures[1] = FUNCTION_SUBBALANCE_SIGNATURE;
        signatures[2] = FUNCTION_SETUSERROLE_SIGNATURE;
        signatures[3] = FUNCTION_CREATEERC20_SIGNATURE;
        signatures[4] = FUNCTION_APPROVEERC20DISTR_SIGNATURE;
        signatures[5] = FUNCTION_CREATEERC20_SIGNATURE;
        signatures[6] = FUNCTION_BURNERC20_SIGNATURE;
        signatures[7] = FUNCTION_MINTERC20_SIGNATURE;

        userGroupAdminArray[0] = uint(UserGroup.ADMIN);

        functionSignatures = signatures;

        require(IAS.enableSignature(signatures, userGroupAdminArray),"COULDNT_SET_PREDEFINED_SIGNATURES_TO_ADMIN");          
    }

    function enableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyDAOCreator returns(bool){
        IAccessibilitySettings(accessibilitySettingsAddress).enableSignature(_signatures, _userGroup);
        return true;
    }

    function disableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyDAOCreator returns(bool){
        IAccessibilitySettings(accessibilitySettingsAddress).disableSignature(_signatures, _userGroup);
        return true;
    }

    // PUBLIC FUNCTIONS WITH CHECK ACCESSIBILITY

    function addBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_ADDBALANCE_SIGNATURE, true) returns(bool){
        require(_user != address(0), "CANT_ADD_BALANCE_ON_NULL_ADDRESS");
        require(_token != address(0), "TOKEN_CANT_BE_NULL_ADDRESS");
        tokenManagement[_token].lastBlockUserOp[_user] = block.number;  // Sender can't redeem for one day this token
        uint oldbalance = accountability[_token][_user];
        uint newBalance = oldbalance.add(_amount);
        accountability[_token][_user] = newBalance;
        emit ChangeBalanceEvent(msg.sender, _token, _user, oldbalance, newBalance);
        return true;
    }

    function subBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_SUBBALANCE_SIGNATURE, true) returns(bool){
        require(_user != address(0), "CANT_ADD_BALANCE_ON_NULL_ADDRESS");
        require(_token != address(0), "TOKEN_CANT_BE_NULL_ADDRESS");
        tokenManagement[_token].lastBlockUserOp[_user] = block.number;  // Sender can't redeem for one day this token
        uint oldbalance = accountability[_token][_user];
        uint newBalance = oldbalance.sub(_amount);
        accountability[_token][_user] = newBalance;
        emit ChangeBalanceEvent(msg.sender, _token, _user, oldbalance, newBalance);
        return true;
    }

    function setUserListRole(address[] memory _userAddress, uint[] memory _userGroup) checkAccessibility(FUNCTION_SETUSERROLE_SIGNATURE, true) public returns(bool){
        require(_userAddress.length == _userGroup.length, "DATA_LENGTH_DISMATCH");
        IAccessibilitySettings(accessibilitySettingsAddress).setUserListRole(_userAddress,_userGroup);
        return true;
    }

    function approveERC20Distribution(address _token, uint _amount) public checkAccessibility(FUNCTION_APPROVEERC20DISTR_SIGNATURE, true) temporaryLockSecurity(_token) returns(bool){
        require(_token != address(0), "CANT_REFER_TO_NULL_ADDRESS");
        require(_amount > 0, "CANT_APPROVE_NULL_AMOUNT");
        require(tokenReferreal[_token] == msg.sender, "REFEREE_DISMATCH");
        IERC20Upgradeable(_token).approve(address(this), _amount);
        tokenManagement[_token].lastBlockChange = block.number;
        emit SecurityTokenMovements(msg.sender, _token, uint(opID.APPROVE), block.number, _amount);
        return true;
    }

    function redeemListOfERC20(address[] memory _tokenList) public returns(bool){
        uint userBalance;
        address token;
        bool result;
        result = false;
        IERC20Upgradeable IERC20U;
        for(uint index; index < _tokenList.length; index++){
            tokenManagement[_tokenList[index]].lastBlockUserOp[msg.sender] = block.number;
            token = _tokenList[index];
            userBalance = getBalance(token, msg.sender);
            if(userBalance > 0 && getBlocksUserOpRemained(token, msg.sender) > 0){
                tokenManagement[_tokenList[index]].lastBlockUserOp[msg.sender] = block.number;  // Sender can't redeem again for one day this token after setting this
                accountability[token][msg.sender] = uint(0);
                IERC20U = IERC20Upgradeable(token);
                require(IERC20U.balanceOf(address(this)) >= userBalance, "NO SUFFICIENT_FUND_FROM_THE_DAO");
                IERC20U.transferFrom(address(this), msg.sender, userBalance);
                emit SecurityTokenMovements(msg.sender, token, uint(opID.REDEEM), block.number, userBalance);
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
        tokenManagement[tokenAddress].lastBlockChange = block.number;            // No one can't burn, mint or approve for one day this token
        tokenManagement[tokenAddress].lastBlockUserOp[_referree] = block.number; // Referee can't redeem for one day this token
        emit CreateERC20UpgradeableEvent(msg.sender, _tokenName, _tokenSymbol, _totalSupply, 18, _referree, tokenAddress);
        emit SecurityTokenMovements(msg.sender, tokenAddress, uint(opID.CREATE), block.number, _totalSupply.mul(10**18));
        return true;
    }

    function mintUpgradeableERC20Token(address _token, uint _amount) public checkAccessibility(FUNCTION_MINTERC20_SIGNATURE, true) temporaryLockSecurity(_token) returns(bool){
        require(tokenReferreal[_token] == msg.sender, "REFEREE_DISMATCH"); 
        require(_amount > 0, "INSUFFICIENT_AMOUNT");
        IDynamicERC20Upgradeable IDERC20U = IDynamicERC20Upgradeable(_token);
        IERC20Upgradeable IERC20U = IERC20Upgradeable(_token);
        require(IERC20U.balanceOf(address(this)).div(_amount) > uint(10), "MINT_AMOUNT_DISMATCH_SECURITY"); // At least I can mint the 10% of the whole balance
        require(address(this) == IDERC20U.getOwner(), "OWNER_DISMATCH");
        tokenManagement[_token].lastBlockChange = block.number;             // No one can't burn, mint or approve for one day this token
        tokenManagement[_token].lastBlockUserOp[msg.sender] = block.number; // Sender can't redeem for one day
        IDERC20U.mint(address(this), _amount, 18);
        emit SecurityTokenMovements(msg.sender, _token, uint(opID.MINT), block.number, _amount);
        return true;
    }

    function burnUpgradeableERC20Token(address _token, uint _amount) public checkAccessibility(FUNCTION_BURNERC20_SIGNATURE, true) temporaryLockSecurity(_token) returns(bool){
        require(_amount > 0, "INSUFFICIENT_AMOUNT");
        IDynamicERC20Upgradeable IDERC20U = IDynamicERC20Upgradeable(_token);
        require(tokenReferreal[_token] == msg.sender, "REFEREE_DISMATCH"); 
        require(address(this) == IDERC20U.getOwner(), "OWNER_DISMATCH");
        require(IERC20Upgradeable(_token).balanceOf(address(this)).div(_amount) > uint(10), "BURN_AMOUNT_DISMATCH_SECURITY"); // At least I can burn the 10% of the whole balance
        tokenManagement[_token].lastBlockChange = block.number;             // No one can't burn, mint or approve for one day this token
        tokenManagement[_token].lastBlockUserOp[msg.sender] = block.number; // Sender can't redeem for one day
        IDERC20U.burn(_amount);
        emit SecurityTokenMovements(msg.sender, _token, uint(opID.BURN), block.number, _amount);
        return true;
    }

    function getOwnUserGroupForThisSmartContract() public view returns(uint){
        return IAccessibilitySettings(accessibilitySettingsAddress).getUserGroup(msg.sender);
    }

    function isTokenPresentInsideTheDAO(address _token) public view returns(bool){
        if(tokenManagement[_token].lastBlockChange > 0) {
            return true;
        } else {
            return false;
        }
    }

    function getAccessibility(bytes4 _functionSignature) public view returns(bool){
        return IAccessibilitySettings(accessibilitySettingsAddress).getAccessibility(_functionSignature, msg.sender);
    }

    function getBlocksRemained(address _token) public view returns(uint){
        return N_BLOCK_DAY.sub(block.number.sub(tokenManagement[_token].lastBlockChange));
    }

    function getBlocksUserOpRemained(address _token, address _user) public view returns(uint){
        return N_BLOCK_DAY.sub(tokenManagement[_token].lastBlockUserOp[_user]);
    }

    function getFunctionSignatures() public view returns(bytes4[] memory){
        return functionSignatures;
    }

    function getBalance(address _token, address _user) public view returns(uint){
        return accountability[_token][_user];
    }
}