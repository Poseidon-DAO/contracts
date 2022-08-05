// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.3; 

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol'; 
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol';
import './../../interfaces/IERC1155_PDN.sol';
import './../../interfaces/IAccessibilitySettings.sol';
 
contract ERC20_PDN is ERC20Upgradeable { 

    using SafeMathUpgradeable for uint;
    
    address public owner;

    address public ERC1155Address;
    uint public ID_ERC1155;
    uint public ratio;
    uint public ownerLock;

    struct vest {
        uint amount;
        uint expirationDate;
    }

    mapping(address => vest) vestList;

    address AccessibilitySettingsAddress;

    event ERC1155SetEvent(address indexed owner, address ERC1155address, uint ERC1155ID, uint ratio);
    event DAOConnectionEvent(address indexed owner, address AccessibilitySettingsAddress);
    event OwnerChangeEvent(address indexed oldOwner, address indexed newOwner);
    event AddVestEvent(address to, uint amount, uint duration);
    event WithdrawVestEvent(address receiver, uint amount);

    modifier onlyOwner {
        require(owner == msg.sender, "ONLY_ADMIN_CAN_RUN_THIS_FUNCTION");
        _;
    }

    modifier securityFreeze(){
        address tmpAccessibilitySettingsAddress = AccessibilitySettingsAddress;
        if(tmpAccessibilitySettingsAddress != address(0)){
            require(IAccessibilitySettings(tmpAccessibilitySettingsAddress).getIsFrozen() == false, "FROZEN");
        }
        _;
    }

    function initialize(string memory _name, string memory _symbol, uint _totalSupply, uint _decimals) initializer public {
        __ERC20_init(_name, _symbol);
        _mint(msg.sender, _totalSupply * (uint(10) ** _decimals));   
        owner = msg.sender;
        emit OwnerChangeEvent(address(0), msg.sender);
    }

    function runAirdrop(address[] memory _addresses, uint[] memory _amounts, uint _decimals) public securityFreeze returns(bool){
        require(owner == msg.sender, "ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
        require(_addresses.length == _amounts.length, "DATA_DIMENSION_DISMATCH");
        uint availableOwnerBalance = balanceOf(msg.sender).sub(ownerLock);
        for(uint index = uint(0); index < _addresses.length; index++){
            require(_addresses[index] != address(0) && _amounts[index] != uint(0), "CANT_SET_NULL_VALUES");
            require(availableOwnerBalance >= _amounts[index], "INSUFFICIENT_OWNER_BALANCE");
            availableOwnerBalance = availableOwnerBalance.sub(_amounts[index]);
            _transfer(msg.sender, _addresses[index], _amounts[index].mul(uint(10) ** _decimals));
        }
        return true;
    }

    // DAO connection

    function connectToDAO(address _accessibilitySettingsAddress) public returns(bool){
        address DAOCreatorAddress = IAccessibilitySettings(_accessibilitySettingsAddress).getDAOCreator();
        require(DAOCreatorAddress == msg.sender && DAOCreatorAddress == owner, "OWNER_DAO_ADDRESS_DISMATCH");
        AccessibilitySettingsAddress = _accessibilitySettingsAddress;
        emit DAOConnectionEvent(msg.sender, _accessibilitySettingsAddress);
        return true;
    }

    function changeOwnerWithMultisigDAO(address _newOwner) external securityFreeze returns(bool){ //TEST
        require(IAccessibilitySettings(AccessibilitySettingsAddress).getMultiSigRefAddress() == msg.sender, "MULTISIG_CALLER_ADDRESS_DISMATCH");
        address oldOwner = owner;
        owner = _newOwner;
        uint balance = balanceOf(oldOwner);
        _transfer(oldOwner, _newOwner, balance);
        emit OwnerChangeEvent(oldOwner, _newOwner);
        return true;
    }

    // Burning system

    function burn(uint _amount) public returns(bool){
        _burn(msg.sender, _amount);
        return true;
    }
 
    function burnAndReceiveNFT(uint _amount) public securityFreeze returns(bool){
        address tmpERC1155Address = ERC1155Address;
        require(tmpERC1155Address != address(0), "ERC1155_ADDRESS_NOT_SET");
        uint tmpRatio = ratio;
        uint NFTAmount = _amount.div(tmpRatio);
        require(balanceOf(msg.sender).div(tmpRatio) >= NFTAmount && NFTAmount > uint(0), "NOT_ENOUGH_TOKEN_TO_RECEIVE_NFT");
        _burn(msg.sender, NFTAmount.mul(ratio).mul(uint(10) ** decimals()));
        IERC1155_PDN IERC1155_PDN_Interface = IERC1155_PDN(ERC1155Address);
        IERC1155_PDN_Interface.mint(msg.sender, ID_ERC1155, NFTAmount, bytes("0"));
        return true;
    }

    // ERC20-ERC1155 Connection settings

    function setERC1155(address _ERC1155Address, uint _ID_ERC1155, uint _ratio) public onlyOwner securityFreeze returns(bool){
        require(_ERC1155Address != address(0), "ADDRESS_CANT_BE_NULL");
        require(_ID_ERC1155 > uint(0), "ID_CANT_BE_ZERO");
        require(_ratio > uint(0), "RATIO_CANT_BE_ZERO");
        ERC1155Address = _ERC1155Address;
        ID_ERC1155 = _ID_ERC1155;
        ratio = _ratio;
        emit ERC1155SetEvent(msg.sender, _ERC1155Address, _ID_ERC1155, _ratio);
        return true;
    }

    // Vesting System

    function addVest(address _address, uint _amount, uint _duration) public onlyOwner returns(bool){
        uint tmpOwnerLock = ownerLock;
        require(vestList[_address].amount == uint(0), "VEST_ALREADY_SET");
        require(balanceOf(owner).sub(tmpOwnerLock) >= _amount, "INSUFFICIENT_OWNER_BALANCE");
        vestList[_address].amount = _amount;
        vestList[_address].expirationDate = uint(block.number).add(_duration);
        ownerLock = tmpOwnerLock.add(_amount);
        emit AddVestEvent(_address, _amount, _duration);
        return true;
    }

    function withdrawVest() public returns(bool){
        uint vestAmount = vestList[msg.sender].amount;
        require(vestAmount > uint(0), "VEST_NOT_SET");
        require(vestList[msg.sender].expirationDate < block.number, "VEST_NOT_EXPIRED");
        delete vestList[msg.sender];
        ownerLock = ownerLock.sub(vestAmount);
        _transfer(owner, msg.sender, vestAmount);
        emit WithdrawVestEvent(msg.sender, vestAmount);
        return true;
    }

    function getVestMetaData(address _address) public view returns(uint, uint){
        return (vestList[_address].amount, vestList[_address].expirationDate);
    }
}