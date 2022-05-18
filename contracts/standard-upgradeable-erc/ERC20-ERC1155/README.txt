How the swap token works:

1) We have 1 BLN of PND token and 1 BLN ofn xPND token. Both initialized in an upgradeable ERC20 smart contract.
2) Inside the PND smart contract we have:
    -   a function that only the admin can do where we can approve the xPND smart contract to transfer PND token as
        specified inside the xPND smart contract.
    -   a function that allow us to do an airdrop for a list of addresses
3) Inside the xPND smart contract we have all the logic for staking. What we need to know is:
    -   staking duration is calculated inside the xPND smart contract. For front-end we will have a simple integer between
        1 (ONE_WEEK) and 9 (FOUR_YEARS)
    -   when the xPND is initialized, we have to define the PND address and the year percentace of rewarding
    -   The staking can be done in different periods, the user can choose when and the amount to stake.
        This is done thanks to ther mapping "stakes" defined for each user address and for each stake index
    -   The owner has to approve in the PND smart contract the address of the xPND smart contract
        to be able to run "closeStakes" and get the PND rewarding
    -   It is possible to close more stakes in the same time cause we insert such a variable of the function
        an array of stakeID, Obviously whenever the stake will be close, it will be permanently deleted to have more free space 
        and save gas in the smart contract
    - It is possible to reach data in real time from the xPND smart contract about a stake thanks to "getStakeData"