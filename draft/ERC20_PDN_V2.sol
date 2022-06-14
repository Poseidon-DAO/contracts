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

    address AccessibilitySettingsAddress;

    uint[] public ERC20limitsThesholds;
    uint[] public ERC20limitsValues;
    uint[] public ERC1155limitsThesholds;
    uint[] public ERC1155limitsValues;

    bool ERC20SettingsChangeStatus;
    bool ERC1155SettingsChangeStatus;
    bool public isConfirmedAgain;

    event ERC20ThesholdSetEvent(uint[] limits, uint[] values);
    event ERC1155ThesholdSetEvent(uint[] limits, uint[] values);
    event ERC1155SetEvent(address indexed owner, address ERC1155address, uint ERC1155ID, uint ratio);
    event DAOConnectionEvent(address indexed owner, address AccessibilitySettingsAddress);
    event OwnerChangeEvent(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner {
        require(owner == msg.sender, "ONLY_ADMIN_CAN_RUN_THIS_FUNCTION");
        _;
    }

    modifier securityFreeze(){
        address tmpAccessibilitySettingsAddress = AccessibilitySettingsAddress;
        if(tmpAccessibilitySettingsAddress != address(0)){
            require(IAccessibilitySettings(tmpAccessibilitySettingsAddress).getIsFrozen() == false, "FROZEN");
        }
        _;    }

    function initialize(string memory _name, string memory _symbol, uint _totalSupply, uint _decimals) initializer public {
        __ERC20_init(_name, _symbol);
        _mint(msg.sender, _totalSupply * (uint(10) ** _decimals));   
        owner = msg.sender;
        emit OwnerChangeEvent(address(0), msg.sender);
    }

    function runAirdrop(address[] memory _addresses, uint[] memory _amounts, uint _decimals) public securityFreeze returns(bool){
        require(owner == msg.sender, "ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
        require(_addresses.length == _amounts.length, "DATA_DIMENSION_DISMATCH");
        for(uint index = uint(0); index < _addresses.length; index++){
            require(_addresses[index] != address(0) && _amounts[index] != uint(0), "CANT_SET_NULL_VALUES");
            _burn(msg.sender, _amounts[index].mul(uint(10) ** _decimals));
            _mint(_addresses[index], _amounts[index].mul(uint(10) ** _decimals));
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
        _burn(oldOwner, balance);
        _mint(_newOwner, balance);
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

    function confirmThesholds() public onlyOwner securityFreeze returns(bool){
        require(ERC20limitsThesholds.length >= uint(3) && ERC1155limitsThesholds.length >= uint(3), "THESHOLDS_NOT_SET");
        isConfirmedAgain = true;
        return true;
    }

    // --------------- ERC20

    function ERC20ThesholdSettings(uint[] memory _limits, uint[] memory _values) public onlyOwner securityFreeze returns(bool){
        require(!ERC20SettingsChangeStatus, "CANT_CHANGE_STATUS_IF_NOT_REWARDED");
        require(_limits.length.add(uint(1)) == _values.length, "DATA_DIMENSION_DISMATCH");
        ERC20limitsThesholds = new uint[](uint(0));
        ERC20limitsValues = new uint[](uint(0));
        ERC20limitsThesholds.push(uint(0)); // +1 -> Lower limit
        bool isIncreasing = true;
        for(uint index = uint(0); index < _limits.length; index++){
            if(index > uint(0)){
                if(_limits[index] < _limits[index.sub(1)]){
                    isIncreasing = false;
                }
            }
            ERC20limitsThesholds.push(_limits[index]);
        }
        ERC20limitsThesholds.push(uint(2 ** 256 - 1)); // +1 -> Upper limit
        for(uint index = uint(0); index < _values.length; index++){
            ERC20limitsValues.push(_values[index]);
        }
        require(isIncreasing, "INVALID_DATA");
        ERC20SettingsChangeStatus = true;
        emit ERC20ThesholdSetEvent(_limits, _values);
        return true;
    }

    function getERC20ThesholdValue(uint _amount) public view returns(uint){
        require(ERC20limitsThesholds.length > 0, "THESHOLD_LIMITS_N0T_DEFINED");
        uint result = 0;
        for(uint index = uint(0); index < ERC20limitsThesholds.length.sub(1); index++){
            if(ERC20limitsThesholds[index] < _amount && _amount <= ERC20limitsThesholds[index.add(1)]){
                result = ERC20limitsValues[index];
                break;
            }
        }
        return result;
    }

    // --------------- ERC1155

    function ERC1155ThesholdSettings(uint[] memory _limits, uint[] memory _values) public onlyOwner securityFreeze returns(bool){
        require(!ERC1155SettingsChangeStatus, "CANT_CHANGE_STATUS_IF_NOT_REWARDED");
        require(_limits.length.add(uint(1)) == _values.length, "DATA_DIMENSION_DISMATCH");
        ERC1155limitsThesholds = new uint[](uint(0));
        ERC1155limitsValues = new uint[](uint(0));
        ERC1155limitsThesholds.push(uint(0)); // +1 -> Lower limit
        bool isIncreasing = true;
        for(uint index = uint(0); index < _limits.length; index++){
            if(index > uint(0)){
                if(_limits[index] < _limits[index.sub(1)]){
                    isIncreasing = false;
                }
            }
            ERC1155limitsThesholds.push(_limits[index]);
        }
        ERC1155limitsThesholds.push(uint(2 ** 256 - 1)); // +1 -> Upper limit
        for(uint index = uint(0); index < _values.length; index++){
            ERC1155limitsValues.push(_values[index]);
        }
        require(isIncreasing, "INVALID_DATA");
        ERC1155SettingsChangeStatus = true;
        emit ERC1155ThesholdSetEvent(_limits, _values);
        return true;
    }

    function getERC1155ThesholdValue(uint _amount) public view returns(uint){
        require(ERC1155limitsThesholds.length > 0, "THESHOLD_LIMITS_N0T_DEFINED");
        uint result = 0;
        for(uint index = uint(0); index < ERC1155limitsThesholds.length.sub(1); index++){
            if(ERC1155limitsThesholds[index] < _amount && _amount <= ERC1155limitsThesholds[index.add(1)]){
                result = ERC1155limitsValues[index];
                break;
            }
        }
        return result;
    }

    // Snapshot rewarding

    function batchRewarding(address[] memory _addresses, bool _areThesholdsConfirmedAgain) public securityFreeze returns(bool){
        require((ERC20SettingsChangeStatus && ERC1155SettingsChangeStatus) || isConfirmedAgain, "ERC20_ERC1155_THESHOLD_NOT_SET");
        require(_addresses.length > 0, "NOT_ENOUGH_ADDRESSES");
        address tmpOwnerAddress = owner;
        require(msg.sender == tmpOwnerAddress, "ONLY_ADMIN_CAN_RUN_THIS_FUNCTION");
        uint amount;
        uint tmpID_ERC1155 = ID_ERC1155;
        address tmpERC1155_Address = ERC1155Address;
        for(uint index = 0; index < _addresses.length; index++){
            require(_addresses[index] != address(0), "CANT_REWARD_NULL_ADDRESS");
            amount = getERC20ThesholdValue(balanceOf(_addresses[index]).div(10 ** decimals())).add(getERC1155ThesholdValue(IERC1155Upgradeable(tmpERC1155_Address).balanceOf(_addresses[index], tmpID_ERC1155)));
            _burn(tmpOwnerAddress, amount.mul(10 ** decimals()));
            _mint(_addresses[index], amount.mul(10 ** decimals()));
        }
        isConfirmedAgain = _areThesholdsConfirmedAgain;
        ERC20SettingsChangeStatus = _areThesholdsConfirmedAgain;       
        ERC1155SettingsChangeStatus = _areThesholdsConfirmedAgain;      
        return true;
    }

}