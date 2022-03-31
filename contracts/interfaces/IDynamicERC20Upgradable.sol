// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IERC20U {
    function getOwner() public view returns(address);
    function mint(address _to, uint _totalSupply, uint _decimals) external returns(bool);
    function burn(uint _amount) external returns(bool);
}

