import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  
  if (!deployer) {
    throw new Error("No wallet found to deploy. Check your POLYGON_WALLET_PRIVATE_KEY.");
  }

  console.log("Deploying contracts with the account:", deployer.address);

  const AuditNFT = await ethers.getContractFactory("AuditNFT");
  const auditNFT = await AuditNFT.deploy(deployer.address);

  await auditNFT.waitForDeployment();

  console.log("AuditNFT deployed to:", await auditNFT.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
