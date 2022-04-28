// SPDX-License-Identifier: UNLICENSED


pragma solidity ^0.8.3; 

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

contract ERC721Item is ERC721URIStorageUpgradeable {
    using CountersUpgradeable for CountersUpgradeable.Counter;
    CountersUpgradeable.Counter private _tokenIds;

    constructor(){}
    
    function initialize(string memory _name, string memory _symbol) initializer public {
        __ERC721_init(_name, _symbol);
    }

    function setERC721(address _address, string memory tokenURI)
        public
        returns (uint256)
    {
        _tokenIds.increment();

        uint256 newItemId = _tokenIds.current();
        _mint(_address, newItemId);
        _setTokenURI(newItemId, tokenURI);

        return newItemId;
    }
}