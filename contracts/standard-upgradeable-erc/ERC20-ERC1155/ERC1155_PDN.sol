// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.3; 

import '@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol'; 
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';

contract ERC1155_PDN is ERC1155Upgradeable { 

    using SafeMathUpgradeable for uint;
    
    address public owner;

    address public ERC20Address;

    modifier onlyOwner {
        require(owner == msg.sender, "ONLY_ADMIN_CAN_RUN_THIS_FUNCTION");
        _;
    }

    function initialize(string memory _uri, address _ERC20Address) initializer public {
        __ERC1155_init(_uri);
        ERC20Address = _ERC20Address;
        owner = msg.sender;
    }

    function mint(address _to, uint _id, uint _amount, bytes memory _data) public returns(bool){
        require(msg.sender == ERC20Address, "ADDRESS_DISMATCH");
        _mint(_to, _id, _amount, _data);
        return(true);
    }

    //to check (why I can't override it?)
    function safeTransferFrom() public virtual {
        revert();
    }

    //to check (why I can't override it?)
    function safeBatchTransferFrom() public virtual {
        revert();
    }
    
}