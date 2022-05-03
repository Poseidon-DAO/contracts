// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.3; 

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol'; 
import '../../interfaces/IAccountability.sol';
import '../../interfaces/IMultiSig.sol';
import '../../interfaces/IAccessibilitySettings.sol';
contract DynamicERC20Upgradeable is ERC20Upgradeable { 
 
    address public accountabilityAddress; 

    function initialize(address _accountabilityAddress, string memory _name, string memory _symbol, uint _decimals) initializer public {
        __ERC20_init(_name, _symbol);
        require(IMultiSig(IAccessibilitySettings(IAccountability(_accountabilityAddress).getAccessibilitySettingsAddress()).getMultiSigRefAddress()).getIsMultiSigAddress(msg.sender), "REQUIRE_MULTISIG");
        accountabilityAddress = _accountabilityAddress;
        registerToDAO(_accountabilityAddress, _decimals);
    }

    function mint(address _to, uint _totalSupply, uint _decimals) external returns(bool){ 
        require(msg.sender == accountabilityAddress, "UNAUTHORIZED_ACCESS"); 
        _mint(_to, _totalSupply * (10 ** _decimals)); 
        return true;
    } 

    function burn(uint _amount) external returns(bool){ 
        _burn(msg.sender, _amount); 
        return true;
    }
    
    function registerToDAO(address _accountabilityAddress, uint _decimals) private returns(bool){
        IAccountability(_accountabilityAddress).registerUpgradeableERC20Token(msg.sender, _decimals);
        return true;
    }
}