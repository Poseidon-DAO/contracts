// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.3; 

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol'; 
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC1155/IERC1155Upgradeable.sol';
import '../../interfaces/IERC1155_PDN.sol';

contract ERC20_PDN is ERC20Upgradeable { 

    using SafeMathUpgradeable for uint;
    
    address public owner;

    address public ERC1155Address;
    uint public ID_ERC1155;
    uint public ratio;

    uint[] public ERC20limitsThesholds;
    uint[] public ERC20limitsValues;
    uint[] public ERC1155limitsThesholds;
    uint[] public ERC1155limitsValues;

    modifier onlyOwner {
        require(owner == msg.sender, "ONLY_ADMIN_CAN_RUN_THIS_FUNCTION");
        _;
    }

    function initialize(string memory _name, string memory _symbol, uint _totalSupply, uint _decimals) initializer public {
        __ERC20_init(_name, _symbol);
        _mint(msg.sender, _totalSupply * (uint(10) ** _decimals));   
        owner = msg.sender;
    }

    function runAirdrop(address[] memory _addresses, uint[] memory _amounts, uint _decimals) public returns(bool){
        require(owner == msg.sender, "ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
        require(_addresses.length == _amounts.length, "DATA_DIMENSION_DISMATCH");
        for(uint index = uint(0); index < _addresses.length; index++){
            require(_addresses[index] != address(0) && _amounts[index] != uint(0), "CANT_SET_NULL_VALUES");
            transfer(_addresses[index], _amounts[index].mul(uint(10) ** _decimals));
        }
        return true;
    }

    // Burning system

    function burn(uint _amount) public returns(bool){
        _burn(msg.sender, _amount);
        return true;
    }
 
    function burnAndReceiveNFT(uint _amount) public returns(bool){
        uint tmpRatio = ratio;
        uint NFTAmount = _amount.div(tmpRatio);
        require(balanceOf(msg.sender).div(tmpRatio) >= NFTAmount && NFTAmount > uint(0), "NOT_ENOUGH_TOKEN_TO_RECEIVE_NFT");
        _burn(msg.sender, _amount);
        IERC1155_PDN(ERC1155Address).mint(msg.sender, NFTAmount, ID_ERC1155, 0);
        return true;
    }

    // ERC20-ERC1155 Connection settings

    function setERC1155(address _ERC1155Address, uint _ID_ERC1155, uint _ratio) public onlyOwner returns(bool){
        ERC1155Address = _ERC1155Address;
        ID_ERC1155 = _ID_ERC1155;
        ratio = _ratio;
        return true;
    }

    // --------------- ERC20

    function ERC20ThesholdSettings(uint[] memory _limits, uint[] memory _values) public onlyOwner returns(bool){
        require(_limits.length.add(uint(1)) == _values.length, "DATA_DIMENSION_DISMATCH");
        ERC20limitsThesholds = new uint[](_limits.length.add(2));
        ERC20limitsValues = new uint[](_values.length);
        ERC20limitsThesholds.push(uint(0)); // +1 -> Lower limit
        bool isIncreasing = true;
        for(uint index = uint(0); index < _limits.length; index++){
            if(index > uint(0)){
                if(_limits[index] < _limits[index.add(1)]){
                    isIncreasing = false;
                }
            }
            ERC20limitsThesholds.push(_limits[index]);
            ERC20limitsValues.push(_values[index]);
        }
        ERC20limitsThesholds.push(uint(0)-1); // +1 -> Upper limit
        require(isIncreasing, "INVALID_DATA");
        return true;
    }

    function getERC20ThesholdValue() public view returns(uint){
        uint amount = balanceOf(msg.sender);
        require(ERC20limitsThesholds.length > 0, "POWER_VOTE_SETTINGS_N0T_DEFINED");
        uint result = 0;
        for(uint index = uint(0); index < ERC20limitsThesholds.length.sub(1); index++){
            if(ERC20limitsThesholds[index] < amount && amount <= ERC20limitsThesholds[index.add(1)]){
                result = ERC20limitsValues[index];
            }
        }
        return result;
    }

    // --------------- ERC1155

    function ERC1155ThesholdSettings(uint[] memory _limits, uint[] memory _values) public onlyOwner returns(bool){
        require(_limits.length.add(uint(1)) == _values.length, "DATA_DIMENSION_DISMATCH");
        ERC1155limitsThesholds = new uint[](_limits.length.add(2));
        ERC1155limitsValues = new uint[](_values.length);
        ERC1155limitsThesholds.push(uint(0)); // +1 -> Lower limit
        for(uint index = uint(0); index < _limits.length; index++){
            ERC1155limitsThesholds.push(_limits[index]);
            ERC1155limitsValues.push(_values[index]);
        }
        ERC1155limitsThesholds.push(uint(0)-1); // +1 -> Upper limit
        return true;
    }

    function getERC1155ThesholdValue() public view returns(uint){
        uint amount = IERC1155Upgradeable(ERC1155Address).balanceOf(msg.sender, ID_ERC1155);
        require(ERC1155limitsThesholds.length > 0, "POWER_VOTE_SETTINGS_N0T_DEFINED");
        uint result = 0;
        for(uint index = uint(0); index < ERC1155limitsThesholds.length.sub(1); index++){
            if(ERC1155limitsThesholds[index] < amount && amount <= ERC1155limitsThesholds[index.add(1)]){
                result = ERC1155limitsValues[index];
            }
        }
        return result;
    }

    // ---------------- NFT rewarding

}