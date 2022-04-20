// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.3; 

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol'; 
import '../../interfaces/IAccountability.sol';

contract DynamicERC20Upgradeable is ERC20Upgradeable { 
 
    address public accountabilityAddress; 
    
    constructor(address _accountabilityAddress) {
        accountabilityAddress = _accountabilityAddress;
    }

    function initialize(string memory _name, string memory _symbol) initializer public {
        __ERC20_init(_name, _symbol);
        registerToDAO();
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
    
    function registerToDAO() private returns(bool){
        IAccountability(accountabilityAddress).registerUpgradeableERC20Token(msg.sender);
        return true;
    }
}