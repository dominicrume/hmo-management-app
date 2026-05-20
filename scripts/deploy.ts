/**
 * Hardhat deployment script — MattysPlaceAudit contract.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network polygonAmoy
 *
 * Requires in .env.local:
 *   POLYGON_RPC_URL=https://rpc-amoy.polygon.technology/
 *   POLYGON_WALLET_PRIVATE_KEY=0x...
 *
 * After deployment, add to .env.local:
 *   NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed address>
 *   POLYGON_CONTRACT_ADDRESS=<deployed address>
 */

// @ts-ignore
import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error('No wallet found. Set POLYGON_WALLET_PRIVATE_KEY in .env.local');
  }

  console.log('Deploying MattysPlaceAudit...');
  console.log('Deployer:      ', deployer.address);
  console.log('Balance:       ', ethers.formatEther(await ethers.provider.getBalance(deployer.address)), 'MATIC');

  const Factory  = await ethers.getContractFactory('MattysPlaceAudit');
  const contract = await Factory.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('\n✅ MattysPlaceAudit deployed to:', address);
  console.log('   Network: Polygon Amoy Testnet (chainId 80002)');
  console.log('   Explorer: https://amoy.polygonscan.com/address/' + address);
  console.log('\nAdd to .env.local:');
  console.log('  NEXT_PUBLIC_CONTRACT_ADDRESS=' + address);
  console.log('  POLYGON_CONTRACT_ADDRESS=' + address);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
