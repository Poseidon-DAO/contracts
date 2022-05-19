// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

import '../structures/MetaDataStructure.sol';
import '../../shared/Signatures.sol';
import '../../interfaces/IAccessibilitySettings.sol';
import '../../interfaces/IERC20_PDN.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol';


contract Accountability is Signatures, MetaDataStructure, Initializable {
 
    using SafeMathUpgradeable for uint256;

    uint public securityDelay;
    uint public MIN_MINT_AMOUNT;
    uint public MAX_PERC_TO_MINT;
    uint public MAX_PERC_TO_BURN; 
    
    address public accessibilitySettingsAddress;
    
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
        uint decimals;
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
        require(block.number.sub(securityDelay.add(tokenManagement[_token].lastBlockChange)) >= 0, "SECURITY_LOCK");
        _;
    }

    modifier securityFreeze(){
        require(IAccessibilitySettings(accessibilitySettingsAddress).getIsFrozen() == false, "FROZEN");
        _;
    }

    function initialize(address _accessibilitySettingsAddress, uint _securityDelay) public initializer {
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
        uint index = 0;
        signatures[index++] = FUNCTION_ADDBALANCE_SIGNATURE;
        signatures[index++] = FUNCTION_SUBBALANCE_SIGNATURE;
        signatures[index++] = FUNCTION_SETUSERROLE_SIGNATURE;
        signatures[index++] = FUNCTION_CREATEERC20_SIGNATURE;
        signatures[index++] = FUNCTION_APPROVEERC20DISTR_SIGNATURE;
        signatures[index++] = FUNCTION_BURNERC20_SIGNATURE;
        signatures[index++] = FUNCTION_MINTERC20_SIGNATURE;

        userGroupAdminArray[0] = uint(UserGroup.ADMIN);

        IAS.enableSignature(signatures, userGroupAdminArray);   

        // ------------------------------------------------------------ Setting default constant

        // PARAMETRIZZARE
        securityDelay = _securityDelay;
        MIN_MINT_AMOUNT = uint(1000);
        MAX_PERC_TO_MINT = uint(5);  
        MAX_PERC_TO_BURN = uint(5);
    }

    function enableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyDAOCreator securityFreeze returns(bool){
        IAccessibilitySettings(accessibilitySettingsAddress).enableSignature(_signatures, _userGroup);
        return true;
    }

    function disableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyDAOCreator securityFreeze returns(bool){
        IAccessibilitySettings(accessibilitySettingsAddress).disableSignature(_signatures, _userGroup);
        return true;
    }

    function changeSecurityDelay(uint _securityDelay) public onlyDAOCreator securityFreeze returns(bool){
        require(securityDelay != _securityDelay, "CANT_SET_THE_SAME_VALUE");
        securityDelay = _securityDelay;
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
        uint decimals = tokenManagement[_token].decimals;
        IERC20Upgradeable(_token).approve(address(this), _amount.mul(uint(10) ** decimals));
        tokenManagement[_token].lastBlockChange = block.number;
        emit SecurityTokenMovements(msg.sender, _token, uint(opID.APPROVE), _amount.mul(uint(10) ** decimals));
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
            if(userBalance > 0 && securityDelay > block.number.sub(tokenManagement[token].lastBlockUserOp[msg.sender])){
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

    function registerUpgradeableERC20Token(address _referree, uint _decimals) external securityFreeze returns(bool){
        tokenReferreal[msg.sender] = _referree;                                // msg.sender has to be DUERC20
        tokenManagement[msg.sender].lastBlockChange = block.number;            // No one can't burn, mint or approve for one day this token
        tokenManagement[msg.sender].lastBlockUserOp[_referree] = block.number; // Referee can't redeem for one day this token
        tokenManagement[msg.sender].decimals = _decimals; // Referee can't redeem for one day this token
        emit RegisterERC20UpgradeableEvent(msg.sender, _referree);
        emit SecurityTokenMovements(_referree, msg.sender, uint(opID.CREATE), uint(0));
        return true;
    }

    function burnUpgradeableERC20Token(address _token, uint _amount) public checkAccessibility(FUNCTION_BURNERC20_SIGNATURE, true) temporaryLockSecurity(_token) securityFreeze returns(bool){
        require(_amount > 0, "INSUFFICIENT_AMOUNT"); ///////////////////////////////TO CHECK
        require(tokenReferreal[_token] == msg.sender, "REFEREE_DISMATCH");
        IERC20Upgradeable IERC20U = IERC20Upgradeable(_token);
        uint tokenBalance = IERC20U.balanceOf(address(this));
        uint decimals = tokenManagement[_token].decimals;
        require(tokenBalance > 0 && _amount <= uint(MAX_PERC_TO_BURN).mul(tokenBalance.div(uint(10) ** (decimals + uint(2)))), "SECURITY_DISMATCH"); 
        tokenManagement[_token].lastBlockChange = block.number;             // No one can't burn, mint or approve for one day this token
        tokenManagement[_token].lastBlockUserOp[msg.sender] = block.number; // Sender can't redeem for one day
        IERC20_PDN(_token).burn(_amount.mul(uint(10) ** decimals));
        emit SecurityTokenMovements(msg.sender, _token, uint(opID.BURN), _amount.mul(uint(10) ** decimals));
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
    
    function getAccessibilitySettingsAddress() public view returns(address){
        return accessibilitySettingsAddress;
    }

}