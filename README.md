# Poseidon DAO Smart Contracts

<div>
  <a href="https://www.ethereum.org/" target="_blank"><img src="https://img.shields.io/badge/platform-Ethereum-brightgreen.svg?style=flat-square" alt="Ethereum" /></a>
  <a href="https://ethereum.org/en/developers/docs/standards/tokens/erc-20/" target="_blank"><img src="https://img.shields.io/badge/token-ERC20-ff69b4.svg?style=flat-square" alt="Token ERC20" /> </a>
</div>

## Development

In order to get started install node dependencies:

> yarn install

*NOTE*: node version `>=14.14.0` required. Set stable fermium version for development

> nvm use lts/fermium

List of common required commands during development

Run hardhat locally:

> npx hardhat node

Connect to hardhat node from console:

> npx hardhat node

In the console deploy the smart contract:

> const Token = await ethers.getContractFactory("Token")
> deployed = await Token.deploy()

Get deployer:
> [deployer] = await ethers.getSigners()

Get deployer address:

> address = await deployer.getAddress()

Install typescript dependecies to be able to run hardhat:

> npm install --save-dev typescript
## TESTS DONE

Unit Test: MultiSig
    ✔ createMultiSigPoll - Can't be run from stranger address (98ms)
    ✔ createMultiSigPoll - Can't set not valid ID (57ms)
    ✔ createMultiSigPoll - Change Creator (115ms)
    ✔ voteMultiSigPoll - Can't be run from stranger address (138ms)
    ✔ voteMultiSigPoll - Can't vote two times for the same poll (174ms)
    ✔ voteMultiSigPoll - Vote without actions (<3/5) (178ms)
    ✔ voteMultiSigPoll - Vote with actions (>=3/5) - change DAO creator (360ms)
    ✔ voteMultiSigPoll - Vote with actions (>=3/5) - Can't delete multisig if signature list lenght has minimum requirement (266ms)
    ✔ voteMultiSigPoll - Vote with actions (>=3/5) - Add new address on multisig (288ms)
    ✔ voteMultiSigPoll - Vote with actions (>=3/5) - Can't add new address on multisig if already present (264ms)
    ✔ voteMultiSigPoll - Vote with actions - Delete address on multisig (683ms)
    ✔ voteMultiSigPoll - Vote with actions - Can't delete address on multisig if not present (669ms)
    ✔ voteMultiSigPoll - Vote with actions - Can't delete address on multisig if minimum we don't have 5 addresses (180ms)
    ✔ voteMultiSigPoll - Vote with actions - Unfreeze (349ms)

  Unit Test: Dynamic ERC20 Token
    ✔ Dynamic ERC20 Upgradeable - Accountability Address on DERC20U match the smart contract accountability address
    ✔ Dynamic ERC20 Upgradeable - Init new token - Check Accountability Token Referee
    ✔ Dynamic ERC20 Upgradeable - A non init token has getLastBlockUserOp = 0
    ✔ Dynamic ERC20 Upgradeable - Init new token - getLastBlockUserOp has to be > 0
    ✔ Dynamic ERC20 Upgradeable - Can't init if not multisig (169ms)

  Unit Test: Accessibility Settings
    ✔ Can't initialize two times the same smart contract (102ms)
    ✔ Enable signatures (158ms)
    ✔ Disable signature (246ms)
    ✔ Can't Enable Empty Group Index (106ms)
    ✔ Can't Enable Empty Signatures (121ms)
    ✔ Can't Disable Empty Group Index (95ms)
    ✔ Can't Disable Empty Signatures (127ms)
    ✔ Set User Role List (167ms)
    ✔ Can't Set User Roles if List Length Dismatch (93ms)
    ✔ Can't Set Null Address in one of the User Role Elements  (126ms)
    ✔ Accessibility is true for enabled signatures and group if caller enabled it before (255ms)
    ✔ Accessibility is false for not enabled signatures but enabled group (217ms)
    ✔ Accessibility is false for enabled signatures but not enabled group (180ms)
    ✔ Accessibility is false for disabled signatures and disabled group (80ms)
    ✔ Accessibility is false for unknown msg.sender (313ms)
    ✔ Get User Group for well know set user (150ms)
    ✔ Default User Group is ZERO (92ms)

  Unit Test: Accountability
    ✔ Check if after depoly DAO Creator is in Admin User Group
    ✔ Check if after deploy the smart contract itself is in Admin User Group
    ✔ Check if after deploy accessibilitySettings has enabled signatures for admin group (189ms)
    ✔ Can Disable Signatures if DAO Creator (345ms)
    ✔ Can't Disable Signatures for strangers (59ms)
    ✔ Can't Disable Admin Functions (126ms)
    ✔ Can Enable Signatures if DAO Creator (156ms)
    ✔ Can't Enable Signatures if strangers (107ms)
    ✔ Can Add Balance with accessibility (127ms)
    ✔ Can't Add Balance without accessibility (39ms)
    ✔ Sub Balance with accessibility (139ms)
    ✔ Can't Sub Balance without accessibility (84ms)
    ✔ Set User List Role with accessibility (40ms)
    ✔ Can't Set User List Role without accessibility (98ms)
    ✔ Can burn ERC20 token with correct referee and data (167ms)
    ✔ Can't burn ERC20 token with correct referee and data if security dismatch (89ms)
    ✔ Can't burn ERC20 token with wrong referee (163ms)
    ✔ Can't burn ERC20 token with 0 amount (97ms)
    ✔ Can approve ERC20 Token with the correct referee and data directly from IERC20U (149ms)
    ✔ Can't approve ERC20 Token if referee dismatch (189ms)
    ✔ Can't approve ERC20 Token if token is NULL (167ms)
    ✔ Can't approve ERC20 Token if amount is 0 (183ms)
    ✔ Redeem list of ERC20 (1364ms)
    ✔ Revert in case all tokens to redeem have amount null (485ms)

  ERC20-ERC1155 Hybrid system
    ✔ Check PDN token initialization
    ✔ Airdrop (116ms)
    ✔ Stranger can't run Airdrop
    ✔ Can't run Airdrop if data dimension dismatch
    ✔ Can't run airdrop if amount is zero (57ms)
    ✔ Can't run airdrop if address is null (70ms)
    ✔ Burn token (108ms)
    ✔ Set ERC1155 - ERC20 Connection (77ms)
    ✔ Stranger can't set ERC1155 - ERC20 Connection
    ✔ Can't set ERC1155 - ERC20 Connection with Null ERC1155 Address
    ✔ Can't set ERC1155 - ERC20 Connection with 0 ID
    ✔ Can't set ERC1155 - ERC20 Connection with 0 ratio
    ✔ Burn ERC20 and receive ERC1155 NFT with exact amount ratio (189ms)
    ✔ Burn ERC20 and receive ERC1155 NFT with different amount from ratio (174ms)
    ✔ Can't burn ERC20 and receive ERC1155 NFT if ERC1155 is not set
    ✔ Can't burn ERC20 and receive ERC1155 NFT if the amount is less than 1 ratio (135ms)
    ✔ Can't burn ERC20 and receive ERC1155 NFT if the balance is not enough to cover the amount (119ms)
    ✔ Override safeTransformFrom function of ERC1155 - function not allowed (331ms)
    ✔ Override safeBatchTransferFrom function of ERC1155 - function not allowed (360ms)
    ✔ Add Vest (117ms)
    ✔ Owner lock amount is the sum of single vests (156ms)
    ✔ Can't Add Vest if it is already set (124ms)
    ✔ Can't Add Vest if owner balance is not sufficient (134ms)
    ✔ Can't Withdraw Vest if not set
    ✔ Can't Withdraw Vest if not expired (56ms)
    ✔ Can't Run withdraw if locked amount is greater than amounts requests (77ms)