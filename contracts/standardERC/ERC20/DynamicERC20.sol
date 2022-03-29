// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.6; 

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol'; 

contract DynamicERC20 is ERC20Upgradeable { 
 
    address public owner; 
        
    function initialize(string memory _name, string memory _symbol) initializer public {
        __ERC20_init(_name, _symbol);
        owner = msg.sender; 
    }

    function mint(address _to, uint _totalSupply, uint _decimals) external { 
        require(msg.sender == owner, "UNAUTHORIZED_ACCESS"); 
        _mint(_to, _totalSupply * (10 ** _decimals)); 
    } 

    function burn(uint _amount) external { 
        _burn(msg.sender, _amount); 
    }
    
}