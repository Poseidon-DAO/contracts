// SPDX-License-Identifier: MIT

pragma solidity ^0.8.3;

interface IMultiSig {
    function createMultiSigPoll(uint _pollTypeID) external returns(uint);
    function voteMultiSigPoll(uint _pollIndex, address _voteForAddress) external returns(bool);
    function getMultiSigLength() external view returns(uint);
    function getIsMultiSigAddress(address _address) external view returns(bool);
    function getListOfActivePoll() external view returns(uint[] memory);
}