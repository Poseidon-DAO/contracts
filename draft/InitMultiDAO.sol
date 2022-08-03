// SPDX-License-Identifier: MIT

import './settings/core/DAOSetup.sol';

pragma solidity ^0.8.0;

// If we want to create dinamically some dao we need to setup like this:
// HAVING IN MIND THAT IN DAOSETUP WE NEED to refer the owner as the sender of this smart contract

contract InitMultiDAO {

    function newDAO() public returns(address){
        return address(new DAOSetup(msg.sender));
    }

}