// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './settings/core/AccessibilitySettings.sol';
import './settings/core/Accountability.sol';
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';

contract DAOSetup {

    using SafeMathUpgradeable for uint256;

    address DAOCreator;
    address[] DAOSmartContractList; // not a mapping cause I need to show the function list that can be used for the front-end

    mapping(address => bool) smartContractsDAO;

    event extendDAOEvent(address indexed DAOCreator, address indexed newSmartContractAddress);

    constructor(){

        DAOCreator = msg.sender;
        address accessibilitySettingsAddress = address(new AccessibilitySettings(msg.sender));
        address accountabilityAddress = address(new Accountability(accessibilitySettingsAddress, msg.sender));

        smartContractsDAO[accessibilitySettingsAddress] = true;
        smartContractsDAO[accountabilityAddress] = true;

        emit extendDAOEvent(msg.sender, accessibilitySettingsAddress);
        emit extendDAOEvent(msg.sender, accountabilityAddress);
    }

    //to be run from every smart contract that will extend the DAO on the constructor
    function extendDAO(address[] memory _smartContractAddressList) public returns(bool){
        require(DAOCreator == msg.sender, "ONLY_CREATOR_CAN_EXTEND_DAO");
        for(uint index = 0; index < _smartContractAddressList.length; index++){
            smartContractsDAO[_smartContractAddressList[index]] = true;
            emit extendDAOEvent(msg.sender, _smartContractAddressList[index]);
        }
        return true;
    }

    function checkIfSmartContractIsInsideTheDAO(address _smartContractAddress) public view returns(bool){
        return smartContractsDAO[_smartContractAddress];
    }

    function getDAOCreator() public view returns(address){
        return DAOCreator;
    }
}