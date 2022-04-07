// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

interface IAccessibilitySettings {
    function getAccessibility(bytes4 _functionSignature, address _userAddress) external view returns(bool);
    function getUserGroup(address _userAddress) external view returns(uint);
    function enableSignature(bytes4[] memory _functionSignatureList, uint[] memory _userRoles) external returns(bool);
    function disableSignature(bytes4[] memory _functionSignatureList, uint[] memory _userRoles) external returns(bool);
    function setUserRole(address _userAddress, uint _userRoleLevel) external returns(bool);
    function setUserListRole(address[] memory _userAddress, uint[] memory _userGroup) external returns(bool);
    function getDAOCreator() external view returns(address);
}