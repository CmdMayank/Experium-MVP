import { expect } from "chai";
import { ethers } from "hardhat";
import { DIDRegistry, AssetNFT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Experium Contracts", function () {
  let didRegistry: DIDRegistry;
  let assetNFT: AssetNFT;
  let owner: SignerWithAddress;
  let manager: SignerWithAddress;
  let auditor: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  beforeEach(async function () {
    [owner, manager, auditor, user1, user2] = await ethers.getSigners();

    const DIDFactory = await ethers.getContractFactory("DIDRegistry");
    didRegistry = await DIDFactory.deploy();

    const AssetFactory = await ethers.getContractFactory("AssetNFT");
    assetNFT = await AssetFactory.deploy(await didRegistry.getAddress());

    // Setup roles
    const MANAGER_ROLE = await assetNFT.MANAGER();
    const AUDITOR_ROLE = await assetNFT.AUDITOR();
    await assetNFT.grantRole(MANAGER_ROLE, manager.address);
    await assetNFT.grantRole(AUDITOR_ROLE, auditor.address);
  });

  describe("DID Registry", function () {
    it("Should create a DID", async function () {
      await expect(didRegistry.connect(user1).createDID())
        .to.emit(didRegistry, "DIDCreated")
        .withArgs(user1.address, `did:ethr:${user1.address.toLowerCase()}`, (time: any) => time > 0);
      expect(await didRegistry.hasDID(user1.address)).to.be.true;
    });

    it("Should revert on duplicate DID", async function () {
      await didRegistry.connect(user1).createDID();
      await expect(didRegistry.connect(user1).createDID()).to.be.revertedWith("DID exists");
    });
  });

  describe("Asset NFT", function () {
    beforeEach(async function () {
      await didRegistry.connect(user1).createDID();
    });

    it("Non-admin/manager mint should revert", async function () {
      await expect(assetNFT.connect(user2).mint(user1.address, "ipfs://test", true))
        .to.be.revertedWith("Caller is not a manager or admin");
    });

    it("Mint to a wallet without a DID should revert", async function () {
      await expect(assetNFT.connect(manager).mint(user2.address, "ipfs://test", true))
        .to.be.revertedWith("recipient has no DID");
    });

    it("Manager can mint and emits AssetMinted", async function () {
      await expect(assetNFT.connect(manager).mint(user1.address, "ipfs://test", true))
        .to.emit(assetNFT, "AssetMinted")
        .withArgs(1, user1.address, manager.address, "ipfs://test");
      expect(await assetNFT.ownerOf(1)).to.equal(user1.address);
    });

    it("Soulbound transfer should revert", async function () {
      await assetNFT.connect(manager).mint(user1.address, "ipfs://test", true);
      await expect(assetNFT.connect(user1).transferFrom(user1.address, user2.address, 1))
        .to.be.revertedWith("soulbound");
    });

    it("Non-soulbound transfer should succeed", async function () {
      await assetNFT.connect(manager).mint(user1.address, "ipfs://test", false);
      await assetNFT.connect(user1).transferFrom(user1.address, user2.address, 1);
      expect(await assetNFT.ownerOf(1)).to.equal(user2.address);
    });

    it("Role grant/revoke only by admin", async function () {
      const MANAGER_ROLE = await assetNFT.MANAGER();
      await expect(assetNFT.connect(user1).grantRole(MANAGER_ROLE, user2.address))
        .to.be.revertedWithCustomError(assetNFT, "AccessControlUnauthorizedAccount");
      
      await assetNFT.connect(owner).grantRole(MANAGER_ROLE, user2.address);
      expect(await assetNFT.hasRole(MANAGER_ROLE, user2.address)).to.be.true;
    });

    it("Auditor can read restricted details", async function () {
      await assetNFT.connect(manager).mint(user1.address, "ipfs://test", true);
      const details = await assetNFT.connect(auditor).getAuditDetails(1);
      expect(details.owner).to.equal(user1.address);
      expect(details.issuer).to.equal(manager.address);
      expect(details.uri).to.equal("ipfs://test");
      expect(details.isSoulbound).to.be.true;
    });

    it("Non-auditor reading restricted details should revert", async function () {
      await assetNFT.connect(manager).mint(user1.address, "ipfs://test", true);
      await expect(assetNFT.connect(user1).getAuditDetails(1))
        .to.be.revertedWith("Caller is not an auditor or admin");
    });
  });
});
