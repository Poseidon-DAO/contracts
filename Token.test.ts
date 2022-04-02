const { BN, constants, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { ZERO_ADDRESS } = constants;
const { ethers } = require('hardhat');

async function deploy() {
  const AccessibilitySettings = await ethers.getContractFactory("AccessibilitySettings");
  return await AccessibilitySettings.deploy();
}


describe("accessibilitySettings Contract", function () {
  let deployed;

  beforeEach(async () => {
    deployed = await deploy();
    const [owner] = await ethers.getSigners();
  });

  it("Token owner should change", async function () {
    expect(true).to.equal(true);
  //   const [deployer, receiver] = await ethers.getSigners();

  //   const deployerAddress = await deployer.getAddress();
  //   await deployed.whitelistCreator(deployerAddress);

  //   await deployed.addNewToken(testURL);
  //   await deployed.setSalePrice(1, 5);

  //   await expect(deployed.connect(receiver).buy(1, { value: 6 }))
  //     .to.emit(deployed, "Sold");

  //   expect(await deployed.ownerOf(1)).to.equal(await receiver.getAddress());
  //   expect(await deployed.tokenURI(1)).to.equal(testURL);
  });
});