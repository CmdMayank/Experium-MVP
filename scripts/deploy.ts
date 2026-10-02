import { ethers } from "hardhat";

async function main() {
  console.log("Starting deployment to Sepolia...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy DIDRegistry
  const didRegistry = await ethers.deployContract("DIDRegistry");
  await didRegistry.waitForDeployment();
  const didAddress = await didRegistry.getAddress();
  console.log("DIDRegistry deployed to:", didAddress);

  // Deploy AssetNFT
  const assetNFT = await ethers.deployContract("AssetNFT", [didAddress]);
  await assetNFT.waitForDeployment();
  const assetAddress = await assetNFT.getAddress();
  console.log("AssetNFT deployed to:", assetAddress);

  console.log("\nDeployment complete!");
  console.log("Update your app.js with these addresses:");
  console.log(`DIDRegistryAddress: "${didAddress}"`);
  console.log(`AssetNFTAddress: "${assetAddress}"`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
