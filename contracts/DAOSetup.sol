// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import './settings/core/AccessibilitySettings.sol';
import './settings/core/Accountability.sol';
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';

contract DAOSetup {

    using SafeMathUpgradeable for uint256;

    address DAOCreator;
    address[] DAOSmartContractList; // not a mapping cause I need to show the function list that can be used for the front-end

    event extendDAOEvent(address indexed DAOCreator, address indexed newSmartContractAddress);
    event isDAOExtensible(address DAOCreator, bool isExtensible);

    constructor(){

        DAOCreator = msg.sender;
        
        address accessibilitySettingsAddress = address(new AccessibilitySettings(msg.sender));
        address accountabilityAddress = address(new Accountability(accessibilitySettingsAddress, msg.sender));

        uint NUM_OF_SMART_CONTRACT_INIT = uint(2);

        address[] memory DAOSmartContractListTmp = new address[](NUM_OF_SMART_CONTRACT_INIT);

        DAOSmartContractListTmp[0] = accessibilitySettingsAddress;
        DAOSmartContractListTmp[1] = accountabilityAddress;

        DAOSmartContractList = DAOSmartContractListTmp;
        for(uint index = 0; index < NUM_OF_SMART_CONTRACT_INIT; index++){
            emit extendDAOEvent(msg.sender, DAOSmartContractListTmp[index]);
        }
    }

    //to be run from every smart contract that will extend the DAO on the constructor
    function extendDAO(address[] memory _smartContractAddressList) public returns(bool){
        require(DAOCreator == msg.sender, "ONLY_CREATOR_CAN_EXTEND_DAO");
        uint numberOfSmartContractInsideTheDAO = DAOSmartContractList.length;
        uint newListingLenght = numberOfSmartContractInsideTheDAO.add(_smartContractAddressList.length);
        address[] memory DAOSmartContractListTmp = new address[](newListingLenght);
        for(uint index = 0; index < newListingLenght; index++){
            if(index < numberOfSmartContractInsideTheDAO){
                DAOSmartContractListTmp[index] = DAOSmartContractList[index];
            } else {
                DAOSmartContractListTmp[index] = _smartContractAddressList[index.sub(numberOfSmartContractInsideTheDAO)];
                emit extendDAOEvent(msg.sender, _smartContractAddressList[index.sub(numberOfSmartContractInsideTheDAO)]);
            }
        }
        DAOSmartContractList = DAOSmartContractListTmp;
        return true;
    }

    function checkIfSmartContractIsInsideTheDAO(address _smartContractAddress) public view returns(bool){
        bool result = false;
        for(uint index = 0; index < DAOSmartContractList.length; index++){
            if(DAOSmartContractList[index] == _smartContractAddress){
                result = true;
            }
        }
        return result;
    }

    function getDAOCreator() public view returns(address){
        return DAOCreator;
    }

    function getDAOSmartContractList() public view returns(address[] memory){
        return DAOSmartContractList;
    }
}