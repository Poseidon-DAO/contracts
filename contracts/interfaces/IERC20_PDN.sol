// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

interface IERC20_PDN {
    function mint(address _to, uint _totalSupply, uint _decimals) external returns(bool);
    function burn(uint _amount) external returns(bool);
    function changeOwnerWithMultisigDAO(address _newOwner) external returns(bool);
    function addVest(address _address, uint _amount, uint _duration) external returns(bool);
    function withdrawVest() external returns(bool);
    function getVestMetaData(address _address) external view returns(uint, uint);
    function deleteVest(address _address) external returns(bool);
}

