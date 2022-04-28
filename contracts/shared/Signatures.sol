// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

contract Signatures {
    bytes4 FUNCTION_ADDBALANCE_SIGNATURE = bytes4(keccak256("addBalance(address,address,uint))"));
    bytes4 FUNCTION_SUBBALANCE_SIGNATURE = bytes4(keccak256("subBalance(address,address,uint)"));
    bytes4 FUNCTION_SETUSERROLE_SIGNATURE = bytes4(keccak256("setUserRole(address,uint)")); 
    bytes4 FUNCTION_CREATEERC20_SIGNATURE = bytes4(keccak256("createERC20(string memory,string memory,uint,uint)"));
    bytes4 FUNCTION_APPROVEERC20DISTR_SIGNATURE = bytes4(keccak256("approveERC20Distribution(address,uint)"));
    bytes4 FUNCTION_BURNERC20_SIGNATURE = bytes4(keccak256("burnUpgradeableERC20Token(address,uint)"));
    bytes4 FUNCTION_MINTERC20_SIGNATURE = bytes4(keccak256("mintUpgradeableERC20Token(address,uint)"));
}