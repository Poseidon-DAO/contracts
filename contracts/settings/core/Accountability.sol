// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import '../structures/MetaDataStructure.sol';
import '../../shared/Signatures.sol';
import '../../interfaces/IAccessibilitySettings.sol';
import '../../interfaces/IDynamicERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';


contract Accountability is Signatures, MetaDataStructure {
 
    using SafeMathUpgradeable for uint256;

    uint N_BLOCK_DAY = uint(5760);
    uint MIN_AMOUNT_TO_MINT = uint(10);
    uint MIN_PERC_TO_MINT = uint(10);
    address accessibilitySettingsAddress;

    mapping(address => mapping(address => uint)) public accountability; // TOKEN -> ADDRESS -> BALANCE
    mapping(address => address) public tokenReferreal; //TOKEN => ADDRESS (user reference that is "owner" of the token)
    mapping(address => tokenManagementMetaData) public tokenManagement;

    event ChangeAccessibilitySettingsAddressEvent(address owner, address accessibilitySettingsAddress);
    event ChangeBalanceEvent(address indexed caller, address indexed token, address indexed user, uint oldBalance, uint newBalance);
    event ApproveDistributionEvent(address indexed referee, address indexed token, uint amount);
    event RedeemEvent(address indexed caller, address indexed token, uint redeemAmount);
    event RegisterERC20UpgradeableEvent(address tokenUpgradeableAddress, address referee);
    event SecurityTokenMovements(address indexed caller, address token, uint opID, uint amount);

    struct tokenManagementMetaData {
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
        require(IAccessibilitySettings(accessibilitySettingsAddress).getDAOCreator() == msg.sender, "LIMITED_FUNCTION_FOR_DAO_CREATOR");
        _;
    }

    modifier checkAccessibility(bytes4 _signature, bool _expectedValue){
        require(IAccessibilitySettings(accessibilitySettingsAddress).getAccessibility(_signature, msg.sender) == _expectedValue, "ACCESS_DENIED");
        _;
    }

    modifier temporaryLockSecurity(address _token){
        require(N_BLOCK_DAY.sub(block.number.sub(tokenManagement[_token].lastBlockChange)) > 0, "SECURITY_LOCK");
        _;
    }

    modifier securityFreeze(){
        require(IAccessibilitySettings(accessibilitySettingsAddress).getIsFrozen() == false, "FROZEN");
        _;
    }

    constructor(address _accessibilitySettingsAddress) {

        require(_accessibilitySettingsAddress != address(0), "NO_NULL_ADD");
        accessibilitySettingsAddress = _accessibilitySettingsAddress;
        IAccessibilitySettings IAS = IAccessibilitySettings(accessibilitySettingsAddress);

        address[] memory adminAddresses = new address[](uint(2));         
        uint[] memory adminAddressesRefGroup = new uint[](uint(2));    

        adminAddresses[0] = IAS.getDAOCreator();
        adminAddresses[1] = address(this);

        adminAddressesRefGroup[0] = uint(UserGroup.ADMIN);
        adminAddressesRefGroup[1] = uint(UserGroup.ADMIN);

        IAS.setUserListRole(adminAddresses, adminAddressesRefGroup);     // Who create the contract is admin

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

        IAS.enableSignature(signatures, userGroupAdminArray);          
    }

    function enableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyDAOCreator securityFreeze returns(bool){
        IAccessibilitySettings(accessibilitySettingsAddress).enableSignature(_signatures, _userGroup);
        return true;
    }

    function disableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyDAOCreator securityFreeze returns(bool){
        IAccessibilitySettings(accessibilitySettingsAddress).disableSignature(_signatures, _userGroup);
        return true;
    }

    // PUBLIC FUNCTIONS WITH CHECK ACCESSIBILITY

    function addBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_ADDBALANCE_SIGNATURE, true) securityFreeze returns(bool){
        require(_user != address(0), "NULL_ADD_NOT_ALLOWED");
        require(_token != address(0), "NULL_ADD_NOT_ALLOWED");
        tokenManagement[_token].lastBlockUserOp[_user] = block.number;  // Sender can't redeem for one day this token
        uint oldbalance = accountability[_token][_user];
        uint newBalance = oldbalance.add(_amount);
        accountability[_token][_user] = newBalance;
        emit ChangeBalanceEvent(msg.sender, _token, _user, oldbalance, newBalance);
        return true;
    }

    function subBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_SUBBALANCE_SIGNATURE, true) securityFreeze returns(bool){
        require(_user != address(0), "NULL_ADD_NOT_ALLOWED");
        require(_token != address(0), "NULL_ADD_NOT_ALLOWED");
        tokenManagement[_token].lastBlockUserOp[_user] = block.number;  // Sender can't redeem for one day this token
        uint oldbalance = accountability[_token][_user];
        uint newBalance = oldbalance.sub(_amount);
        accountability[_token][_user] = newBalance;
        emit ChangeBalanceEvent(msg.sender, _token, _user, oldbalance, newBalance);
        return true;
    }

    function setUserListRole(address[] memory _userAddress, uint[] memory _userGroup) public checkAccessibility(FUNCTION_SETUSERROLE_SIGNATURE, true) securityFreeze returns(bool){
        require(_userAddress.length == _userGroup.length, "DATA_LENGTH_DISMATCH");
        IAccessibilitySettings(accessibilitySettingsAddress).setUserListRole(_userAddress,_userGroup);
        return true;
    }

    function approveERC20Distribution(address _token, uint _amount) public checkAccessibility(FUNCTION_APPROVEERC20DISTR_SIGNATURE, true) temporaryLockSecurity(_token) securityFreeze returns(bool){
        require(_token != address(0), "NULL_ADD_NOT_ALLOWED");
        require(_amount > 0, "NULL_AMOUNT_NOT_ALLOWED");
        require(tokenReferreal[_token] == msg.sender, "REFEREE_DISMATCH");
        IERC20Upgradeable(_token).approve(address(this), _amount);
        tokenManagement[_token].lastBlockChange = block.number;
        emit SecurityTokenMovements(msg.sender, _token, uint(opID.APPROVE), _amount);
        return true;
    }

    function redeemListOfERC20(address[] memory _tokenList) public securityFreeze returns(bool){
        uint userBalance;
        address token;
        bool result;
        result = false;
        for(uint index; index < _tokenList.length; index++){
            tokenManagement[_tokenList[index]].lastBlockUserOp[msg.sender] = block.number;
            token = _tokenList[index];
            userBalance = accountability[token][msg.sender];
            if(userBalance > 0 && N_BLOCK_DAY.sub(tokenManagement[token].lastBlockUserOp[msg.sender]) > 0){
                tokenManagement[_tokenList[index]].lastBlockUserOp[msg.sender] = block.number;  // Sender can't redeem again for one day this token after setting this
                accountability[token][msg.sender] = uint(0);
                require(IERC20Upgradeable(token).balanceOf(address(this)) >= userBalance, "NO_DAO_FUND");
                IERC20Upgradeable(token).transferFrom(address(this), msg.sender, userBalance);
                emit SecurityTokenMovements(msg.sender, token, uint(opID.REDEEM), userBalance);
                emit ChangeBalanceEvent(msg.sender, token, msg.sender, userBalance, uint(0));
                emit RedeemEvent(msg.sender, token, userBalance);
                result = true;
            }
        }
        require(result, "NO_TOKENS");
        return true;
    }

    function registerUpgradeableERC20Token(address _referree) external securityFreeze returns(bool){
        tokenReferreal[msg.sender] = _referree;                                // msg.sender has to be DUERC20
        tokenManagement[msg.sender].lastBlockChange = block.number;            // No one can't burn, mint or approve for one day this token
        tokenManagement[msg.sender].lastBlockUserOp[_referree] = block.number; // Referee can't redeem for one day this token
        emit RegisterERC20UpgradeableEvent(msg.sender, _referree);
        emit SecurityTokenMovements(_referree, msg.sender, uint(opID.CREATE), uint(0));
        return true;
    }

    function mintUpgradeableERC20Token(address _token, uint _amount) public checkAccessibility(FUNCTION_MINTERC20_SIGNATURE, true) temporaryLockSecurity(_token) securityFreeze returns(bool){
        require(tokenReferreal[_token] == msg.sender, "REFEREE_DISMATCH"); 
        require(_amount > 0, "INSUFFICIENT_AMOUNT");
        uint tokenBalance = IERC20Upgradeable(_token).balanceOf(address(this));
        bool securityMint = true;
        if(tokenBalance > MIN_AMOUNT_TO_MINT) {
            if(tokenBalance.div(_amount) > uint(MIN_PERC_TO_MINT)){
                securityMint = false;
            }
        }
        require(securityMint, "SECURITY_DISMATCH"); // At least I can mint the 10% of the whole balance
        tokenManagement[_token].lastBlockChange = block.number;             // No one can't burn, mint or approve for one day this token
        tokenManagement[_token].lastBlockUserOp[msg.sender] = block.number; // Sender can't redeem for one day
        IDynamicERC20Upgradeable(_token).mint(address(this), _amount, 18);
        emit SecurityTokenMovements(msg.sender, _token, uint(opID.MINT), _amount);
        return true;
    }

    function burnUpgradeableERC20Token(address _token, uint _amount) public checkAccessibility(FUNCTION_BURNERC20_SIGNATURE, true) temporaryLockSecurity(_token) securityFreeze returns(bool){
        require(_amount > 0, "INSUFFICIENT_AMOUNT");
        require(tokenReferreal[_token] == msg.sender, "REFEREE_DISMATCH"); 
        require(IERC20Upgradeable(_token).balanceOf(address(this)).div(_amount) > uint(10), "BALANCE_SECURITY_DISMATCH"); // At least I can burn the 10% of the whole balance
        tokenManagement[_token].lastBlockChange = block.number;             // No one can't burn, mint or approve for one day this token
        tokenManagement[_token].lastBlockUserOp[msg.sender] = block.number; // Sender can't redeem for one day
        IDynamicERC20Upgradeable(_token).burn(_amount);
        emit SecurityTokenMovements(msg.sender, _token, uint(opID.BURN), _amount);
        return true;
    }

    function getLastBlockUserOp(address _token, address _referree) public view returns(uint){
        return tokenManagement[_token].lastBlockUserOp[_referree];
    }

    function getAccessibility(bytes4 _functionSignature) public view returns(bool){
        return IAccessibilitySettings(accessibilitySettingsAddress).getAccessibility(_functionSignature, msg.sender);
    }

    function getBalance(address _token, address _user) public view returns(uint){
        return accountability[_token][_user];
    }
}