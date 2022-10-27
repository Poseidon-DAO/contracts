// SPDX-License-Identifier: UNLICENSED

/*
  _____               _     _               _____          ____  
 |  __ \             (_)   | |             |  __ \   /\   / __ \ 
 | |__) ___  ___  ___ _  __| | ___  _ __   | |  | | /  \ | |  | |
 |  ___/ _ \/ __|/ _ | |/ _` |/ _ \| '_ \  | |  | |/ /\ \| |  | |
 | |  | (_) \__ |  __| | (_| | (_) | | | | | |__| / ____ | |__| |
 |_|   \___/|___/\___|_|\__,_|\___/|_| |_| |_____/_/    \_\____/ 
                                                                 
*/

pragma solidity ^0.8.3; 

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol'; 
import '../../interfaces/IAccountability.sol';
import '../../interfaces/IMultiSig.sol';
import '../../interfaces/IAccessibilitySettings.sol';

contract DynamicERC20Upgradeable is ERC20Upgradeable { 
 
    address public accountabilityAddress; 

   /*
    * @dev: This function initialize a standard ERC20 registering it inside the DAO
    *
    * Requirements:
    *       - Only Multisig address can run this function
    */

    function initialize(address _accountabilityAddress, string memory _name, string memory _symbol, uint _totalSupply, uint _decimals, address _referee) initializer public {
        require(IMultiSig(IAccessibilitySettings(IAccountability(_accountabilityAddress).getAccessibilitySettingsAddress()).getMultiSigRefAddress()).getIsMultiSigAddress(msg.sender), "REQUIRE_MULTISIG");
        __ERC20_init(_name, _symbol);
        _mint(_accountabilityAddress, _totalSupply * (10 ** _decimals)); 
        IAccountability(_accountabilityAddress).registerUpgradeableERC20Token(_referee, _decimals); // DAO REGISTRATION
        accountabilityAddress = _accountabilityAddress;
    }

    /*
    *   @dev: standard ERC20 burn function
    */
    
    function burn(uint _amount) external returns(bool){ 
        _burn(msg.sender, _amount); 
        return true;
    }
    
}