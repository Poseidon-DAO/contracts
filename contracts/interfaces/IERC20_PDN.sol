// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

interface IERC20_PDN {
    function mint(address _to, uint _totalSupply, uint _decimals) external returns(bool);
    function burn(uint _amount) external returns(bool);
    function changeOwnerWithMultisigDAO(address _newOwner) external returns(bool);
}

