// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IAccessibilitySettings {
    function getAccessibility(bytes4 _functionSignature, address _userAddress) external view returns(bool);
    function enableSignature(bytes4[] memory _functionSignatureList, uint[] memory _userRoles) external returns(bool);
    function disableSignature(bytes4[] memory _functionSignatureList, uint[] memory _userRoles) external returns(bool);
    function setUserRole(address _userAddress, uint _userRoleLevel) external returns(bool);
}