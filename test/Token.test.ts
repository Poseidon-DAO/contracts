// example file

import chai, { expect } from "chai";
import { ethers } from "hardhat";
import { solidity } from "ethereum-waffle";
import { Contract } from "ethers";

chai.use(solidity);

// const testURL = "https://test.ipfs.dweb.link";

async function deploy() {
  const Token = await ethers.getContractFactory("Token");
  return await Token.deploy();
}

describe("Token contract", function () {
  let deployed: Contract;

  beforeEach(async () => {
    deployed = await deploy();
  });

  // it("Token owner should change", async function () {
  //   const [deployer, receiver] = await ethers.getSigners();

  //   const deployerAddress = await deployer.getAddress();
  //   await deployed.whitelistCreator(deployerAddress);

  //   await deployed.addNewToken(testURL);
  //   await deployed.setSalePrice(1, 5);

  //   await expect(deployed.connect(receiver).buy(1, { value: 6 }))
  //     .to.emit(deployed, "Sold");

  //   expect(await deployed.ownerOf(1)).to.equal(await receiver.getAddress());
  //   expect(await deployed.tokenURI(1)).to.equal(testURL);
  // });
});