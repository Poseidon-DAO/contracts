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
    
    /*
    *   @dev: We create a multi token smart contract manager based on  the token address where it will
    *         follow the normal ERC20 mapping with the info address-balance
    */

    mapping(address => mapping(address => uint)) public accountability; // TOKEN -> ADDRESS -> BALANCE  
    
    /*
    *   @dev: Every new token that will be created will be managed from the smart contract, only the
    *         the address linked to the token can run specific function
    */

    mapping(address => address) public tokenReferreal; //TOKEN => ADDRESS (user reference that is "owner" of the token)
    
    /*
    *   @dev: For security and accountability reasons some information are saved
    */
    
    mapping(address => tokenManagementMetaData) public tokenManagement; // TOKEN -> METASDATA

    struct tokenManagementMetaData {
        uint lastBlockChange;
        mapping(address => uint) lastBlockUserOp;
        uint decimals;
    }

    event ChangeAccessibilitySettingsAddressEvent(address owner, address accessibilitySettingsAddress);
    event ChangeBalanceEvent(address indexed caller, address indexed token, address indexed user, uint oldBalance, uint newBalance);
    event ApproveDistributionEvent(address indexed referee, address indexed token, uint amount);
    event RedeemEvent(address indexed caller, address indexed token, uint redeemAmount);
    event RegisterERC20UpgradeableEvent(address tokenUpgradeableAddress, address referee);
    event SecurityTokenMovements(address indexed caller, address token, uint opID, uint amount);

    enum opID {
        NONE,
        CREATE,
        BURN,
        MINT,
        APPROVE,
        REDEEM
    }

    /*
    * @dev: Only who create the DAO can run this function
    *
    * Requirements:
    *       - { accessibilitySettingsAddress } has to be set
    */

    modifier onlyDAOCreator(){
        require(IAccessibilitySettings(accessibilitySettingsAddress).getDAOCreator() == msg.sender, "LIMITED_FUNCTION_FOR_DAO_CREATOR");
        _;
    }

    /*
    * @dev: Only who has the authorization can run the specific function.
    *
    * Requirements:
    *       - { accessibilitySettingsAddress } has to be set
    *       - { signature } has to be a byte4 signature
    *       - { _expectedValue } has to be set true or false
    */

    modifier checkAccessibility(bytes4 _signature, bool _expectedValue){
        require(IAccessibilitySettings(accessibilitySettingsAddress).getAccessibility(_signature, msg.sender) == _expectedValue, "ACCESS_DENIED");
        _;
    }

    /*
    * @dev: To prevent malicious attacks to run again a function, a specific address has to wait a
    *       { securityDelay } properly set from thre owne3r
    *
    * Requirements:
    *       - { tokenAddress } has to not be equals to null address
    *       - block number - ( securityDelay + last block when the operation was done ) has to be greater than 0
    */

    modifier temporaryLockSecurity(address _token){
        require(block.number.sub(securityDelay.add(tokenManagement[_token].lastBlockChange)) >= 0, "SECURITY_LOCK");
        _;
    }

    /*
    * @dev: Layer of security that lock the smart contract in case of
    *       suspicious activities. To unlock it we need a multisig function call.
    *
    * Requirements:
    *       - { isFrozen } has to be true to be able to run the function
    */

    modifier securityFreeze(){
        require(IAccessibilitySettings(accessibilitySettingsAddress).getIsFrozen() == false, "FROZEN");
        _;
    }

    /*
    * @dev: Different steps are done in this initialization:
    *       - Accessibility Settings address is saved such a connection to other smart contract
    *       - Admin users of this smart contract are defined using the interface call to 'setUserListRole' 
    *       - Admin functionalities are enabled for all functions inside this smart contract
    *       - Default values are defined to limit inflations or deflations.
    *
    * Requirements:
    *       - { accessibilitySettingsAddress } has to not be null
    */

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

        securityDelay = _securityDelay;
        MIN_MINT_AMOUNT = uint(1000);
        MAX_PERC_TO_MINT = uint(5);  
        MAX_PERC_TO_BURN = uint(5);
    }

    /*
    *   @dev: This function enable some functionalities inside the smart contract for specific user group
    */

    function enableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyDAOCreator securityFreeze returns(bool){
        IAccessibilitySettings(accessibilitySettingsAddress).enableSignature(_signatures, _userGroup);
        return true;
    }

    /*
    *   @dev: This function disable some functionalities inside the smart contract for specific user group
    */

    function disableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) public onlyDAOCreator securityFreeze returns(bool){
        IAccessibilitySettings(accessibilitySettingsAddress).disableSignature(_signatures, _userGroup);
        return true;
    }

    /*
    *   @dev: This function allows to link with a correlation 1:1, user address to user group
    *
    *   Requirements:
    *       - Both arrays have to have the same length
    */
    
    function setUserListRole(address[] memory _userAddress, uint[] memory _userGroup) public checkAccessibility(FUNCTION_SETUSERROLE_SIGNATURE, true) securityFreeze returns(bool){
        require(_userAddress.length == _userGroup.length, "DATA_LENGTH_DISMATCH");
        IAccessibilitySettings(accessibilitySettingsAddress).setUserListRole(_userAddress,_userGroup);
        return true;
    }

    /*
    *   @dev: This function change the { securityDelay } (the time between every run of the same group function)
    *
    *   Requirements:
    *       - User can't set the same { securityDelay } saved inside the smart contract
    */

    function changeSecurityDelay(uint _securityDelay) public onlyDAOCreator securityFreeze returns(bool){
        require(securityDelay != _securityDelay, "CANT_SET_THE_SAME_VALUE");
        securityDelay = _securityDelay;
        return true;
    }

    // PUBLIC FUNCTIONS WITH CHECK ACCESSIBILITY

    /*
    *   @dev: This function add an amount to the balance for a specific token to a specific address
    *
    *   Requirements:
    *       - { userAddress } can't be a null address
    *       - { tokenAddress } can't be a null address
    *       - checkAccessibility(FUNCTION_ADDBALANCE_SIGNATURE, true)
    *       - securityFreeze
    *
    *   Events:
            - ChangeBalanceEvent
    */

    function addBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_ADDBALANCE_SIGNATURE, true) securityFreeze returns(bool){
        require(_user != address(0), "NULL_ADD_NOT_ALLOWED");
        require(_token != address(0), "NULL_ADD_NOT_ALLOWED");
        tokenManagement[_token].lastBlockUserOp[_user] = block.number;  // Sender can't redeem for { securityDelay} blocks this token
        uint oldbalance = accountability[_token][_user];
        uint newBalance = oldbalance.add(_amount);
        accountability[_token][_user] = newBalance;
        emit ChangeBalanceEvent(msg.sender, _token, _user, oldbalance, newBalance);
        return true;
    }

    /*
    *   @dev: This function sub an amount to the balance for a specific token to a specific address
    *
    *   Requirements:
    *       - { userAddress } can't be a null address
    *       - { tokenAddress } can't be a null address
    *       - checkAccessibility(FUNCTION_SUBBALANCE_SIGNATURE, true)
    *       - securityFreeze
    *
    *   Events:
            - ChangeBalanceEvent
    */

    function subBalance(address _token, address _user, uint _amount) external checkAccessibility(FUNCTION_SUBBALANCE_SIGNATURE, true) securityFreeze returns(bool){
        require(_user != address(0), "NULL_ADD_NOT_ALLOWED");
        require(_token != address(0), "NULL_ADD_NOT_ALLOWED");
        tokenManagement[_token].lastBlockUserOp[_user] = block.number;  // Sender can't redeem for { securityDelay} blocks this token
        uint oldbalance = accountability[_token][_user];
        uint newBalance = oldbalance.sub(_amount);
        accountability[_token][_user] = newBalance;
        emit ChangeBalanceEvent(msg.sender, _token, _user, oldbalance, newBalance);
        return true;
    }

   /*
    *   @dev: This function approves a specific balance for a specific token 
    *
    *   Requirements:
    *       - { amount } has to be greatr than 0
    *       - { tokenAddress } can't be a null address
    *       - Token Referee has to match
    *       - checkAccessibility(FUNCTION_APPROVEERC20DISTR_SIGNATURE, true)
    *       - securityFreeze
    *
    *   Events:
    *       - SecurityTokenMovements
    */

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

   /*
    *   @dev: This function allows to redeem a list of token that an address has.
    *         Token functionalities are locked for { securityDelay } blocks
    *
    *   Requirements:
    *       - Funds for each token for this smart contract address has to cover the request
    *       - securityFreeze
    *
    *   Events:
    *       - SecurityTokenMovements
    *       - ChangeBalanceEven
    *       - RedeemEvent
    */

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
                tokenManagement[_tokenList[index]].lastBlockUserOp[msg.sender] = block.number;  // Sender can't redeem again for { securityDelay } blocks this token after setting this
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

   /*
    *   @dev: This function has to be run from a Dynamic Upgradeable ERC20 smart contract.
    *         It allows to save inside this smart contract a dynmic ERC20 enabling functionalities to referee
    *
    *   Requirements:
    *       - DUERC20 caller (see DynamicERC20Upgradeable.sol)
    *
    *   Events:
    *       - RegisterERC20UpgradeableEvent
    *       - SecurityTokenMovements
    */

    function registerUpgradeableERC20Token(address _referree, uint _decimals) external securityFreeze returns(bool){
        tokenReferreal[msg.sender] = _referree;                                // msg.sender has to be DUERC20
        tokenManagement[msg.sender].lastBlockChange = block.number;            // No one can't burn, mint or approve for { securityDelay } blocks this token
        tokenManagement[msg.sender].lastBlockUserOp[_referree] = block.number; // Referee can't redeem for { securityDelay } blocks this token
        tokenManagement[msg.sender].decimals = _decimals;                      
        emit RegisterERC20UpgradeableEvent(msg.sender, _referree);
        emit SecurityTokenMovements(_referree, msg.sender, uint(opID.CREATE), uint(0));
        return true;
    }

   /*
    *   @dev: This function allows to burn an amount of token of a DUERC20.
    *
    *   Requirements:
    *       - { amount } has to be greater than 0
    *       - token referee has to be who signs the transaction
    *       - can't burn an amount greater than the percentage defined as MAX_PERC_TO_BURN
    *
    *   Events:
    *       - RegisterERC20UpgradeableEvent
    *       - SecurityTokenMovements
    */

    function burnUpgradeableERC20Token(address _token, uint _amount) public checkAccessibility(FUNCTION_BURNERC20_SIGNATURE, true) temporaryLockSecurity(_token) securityFreeze returns(bool){
        require(_amount > 0, "INSUFFICIENT_AMOUNT"); 
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

    /*
        @dev: This function allows us to catch the block number about last user call
    */

    function getLastBlockUserOp(address _token, address _referree) public view returns(uint){
        return tokenManagement[_token].lastBlockUserOp[_referree];
    }

    /*
        @dev: This function allows us to catch the accessibility for a specific signature
    */

    function getAccessibility(bytes4 _functionSignature) public view returns(bool){
        return IAccessibilitySettings(accessibilitySettingsAddress).getAccessibility(_functionSignature, msg.sender);
    }

    /*
        @dev: This function allows us to catch the balance for a specific token
    */

    function getBalance(address _token, address _user) public view returns(uint){
        return accountability[_token][_user];
    }
    
    /*
        @dev: This function allows us to catch the accessibility settings address
    */

    function getAccessibilitySettingsAddress() public view returns(address){
        return accessibilitySettingsAddress;
    }

}