// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IAccountability {
        function changeAccessibilitySettings(address _accessibilitySettingsAddress) external returns(bool);
        function enableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) external returns(bool);
        function disableListOfSignaturesForGroupUser(bytes4[] memory _signatures, uint[] memory _userGroup) external returns(bool);
        function setUserListRole(address[] memory _userAddress, uint[] memory _userGroup) external returns(bool);
        function addBalance(address _token, address _user, uint _amount) external returns(bool);
        function subBalance(address _token, address _user, uint _amount) external returns(bool);
        function getFunctionSignatures() external view returns(bytes4[] memory);
        function approveERC20Distribution(address _token, uint _amount) external returns(bool);
        function redeemERC20(address _token) external returns(bool);
        function redeemListOfERC20(address[] memory _tokenList) external returns(bool);
        function createUpgradeableERC20Token(string memory _tokenName, string memory _tokenSymbol, uint _totalSupply, address _referree) external returns(bool);
        function mintUpgradeableERC20Token(address _token, uint _amount) external returns(bool);
        function burnUpgradeableERC20Token(address _token, uint _amount) external returns(bool);
        function initializeUpgradableToken(address _tokenAddress) external returns(bool);
        function getOwnUserGroupForThisSmartContract() external view returns(uint);
}