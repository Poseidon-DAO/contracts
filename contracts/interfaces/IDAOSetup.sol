// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IDAOSetup {
    function getDAOCreator() external view returns(address);
    function getDAOSmartContractList() external view returns(address[] memory);
    function extendDAO(address _smartContractAddress) external returns(bool);
    function checkIfSmartContractIsInsideTheDAO(address _smartContractAddress) external view returns(bool);
}