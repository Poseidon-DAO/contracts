// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Signatures {
    bytes4 FUNCTION_ADDBALANCE_SIGNATURE = bytes4(keccak256("addBalance(address,address,uint)returns(bool)")); // check better (CHECK SPACEX)
    bytes4 FUNCTION_SUBBALANCE_SIGNATURE = bytes4(keccak256("subBalance(address,address,uint)returns(bool)")); // check better
    bytes4 FUNCTION_SETUSERROLE_SIGNATURE = bytes4(keccak256("setUserRole(address,uint)returns(bool)")); // check better
    bytes4 FUNCTION_CREATEERC20_SIGNATURE = bytes4(keccak256("screateERC20(string memory, string memory, uint, uint)")); // check better, NEED MEMORY?
}