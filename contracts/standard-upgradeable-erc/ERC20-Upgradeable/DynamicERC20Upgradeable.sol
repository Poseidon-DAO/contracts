// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.3; 

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol'; 
import '../../interfaces/IAccountability.sol';
import '../../interfaces/IMultiSig.sol';
import '../../interfaces/IAccessibilitySettings.sol';
contract DynamicERC20Upgradeable is ERC20Upgradeable { 
 
    address public accountabilityAddress; 

    function initialize(address _accountabilityAddress, string memory _name, string memory _symbol, uint _totalSupply, uint _decimals) initializer public {
        require(IMultiSig(IAccessibilitySettings(IAccountability(_accountabilityAddress).getAccessibilitySettingsAddress()).getMultiSigRefAddress()).getIsMultiSigAddress(msg.sender), "REQUIRE_MULTISIG");
        __ERC20_init(_name, _symbol);
        _mint(_accountabilityAddress, _totalSupply * (10 ** _decimals)); 
        IAccountability(_accountabilityAddress).registerUpgradeableERC20Token(msg.sender, _decimals); // DAO REGISTRATION
        accountabilityAddress = _accountabilityAddress;
    }

    function burn(uint _amount) external returns(bool){ 
        _burn(msg.sender, _amount); 
        return true;
    }
    
}