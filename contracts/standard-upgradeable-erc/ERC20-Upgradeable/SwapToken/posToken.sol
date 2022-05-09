// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.3; 

import '@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol'; 
import '@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol';
import '@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol';


contract posToken is ERC20Upgradeable { 

    using SafeMathUpgradeable for uint;

    uint SIX_MONTHS_BLOCKS = uint(5760).mul(uint(7)).mul(uint(181));
    uint ONE_YEAR_BLOCKS = SIX_MONTHS_BLOCKS.mul(uint(2));
    
    address public refTokenAddress;
    address public owner;
    uint public percReward;
    uint totalRewards;

    mapping(address => uint) internal stakes;
    mapping(address => uint) internal endBlockStake; 
    mapping(address => uint) internal ratio;

    event createStakeEvent(address indexed staker, uint amount, uint duration);
    event closeStakeEvent(address indexed staker, uint amount, uint reward);

    function initialize(address _refTokenAddress, uint _percReward, string memory _name, string memory _symbol, uint _totalSupply, uint _decimals) initializer public {
        require(_percReward <= uint(100), "PERCENTAGE_DISMATCH");
        __ERC20_init(_name, _symbol);
        _mint(msg.sender, _totalSupply * (uint(10) ** _decimals));    
        approve(address(this), _totalSupply);
        refTokenAddress = _refTokenAddress;
        owner = msg.sender;
        percReward = _percReward;
    }

    function createStake(uint _amount, uint _stackDuration) public returns(bool){
        require(_stackDuration == SIX_MONTHS_BLOCKS || _stackDuration == ONE_YEAR_BLOCKS, "DURATION_DISMATCH");
        IERC20Upgradeable IERC20U = IERC20Upgradeable(refTokenAddress);
        IERC20U.transferFrom(msg.sender, address(this), _amount); // need to approve before to run this function for the amount
        _burn(owner, _amount);
        _mint(msg.sender, _amount);
        endBlockStake[msg.sender] = uint(block.number).add(_stackDuration);
        ratio[msg.sender] = ONE_YEAR_BLOCKS.div(_stackDuration);
        totalRewards = totalRewards.add(_amount.mul(percReward).div(uint(100))).div(ONE_YEAR_BLOCKS.div(_stackDuration));
        emit createStakeEvent(msg.sender, _amount, _stackDuration);
        return true;
    }
 
    function closeStake() public returns(bool){
        require(block.number > endBlockStake[msg.sender], "STAKE_NOT_EXPIRED");
        uint amountStaked = stakes[msg.sender];
        uint reward = amountStaked.mul(percReward).div(uint(100)).div(ratio[msg.sender]);
        IERC20Upgradeable IERC20U = IERC20Upgradeable(refTokenAddress);
        IERC20U.transferFrom(address(this), msg.sender, amountStaked.add(reward)); 
        totalRewards = totalRewards.sub(reward);
        _burn(msg.sender, amountStaked);
        _mint(owner, amountStaked);
        emit closeStakeEvent(msg.sender, amountStaked, reward);
        return true;
    }

    function airdrop(address[] memory _addresses, uint[] memory _amounts, uint _decimals) public returns(bool){
        require(owner == msg.sender, "ONLY_OWNER_CAN_RUN_THIS_FUNCTION");
        require(_addresses.length == _amounts.length, "DATA_DIMENSION_DISMATCH");
        for(uint index = uint(0); index < _addresses.length; index++){
            require(_addresses[index] != address(0) && _amounts[index] != uint(0), "CANT_SET_NULL_VALUES");
            transfer(_addresses[index], _amounts[index].mul(uint(10) ** _decimals));
        }
        return true;
    }

}