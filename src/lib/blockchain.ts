import { ethers } from 'ethers';

// Use NEXT_PUBLIC_RPC_URL and NEXT_PUBLIC_CONTRACT_ADDRESS in production
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://polygon-rpc.com';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

const abi = [
  "function stampAudit(address to, string memory uri, string memory documentHash) public returns (uint256)",
  "event AuditStamped(uint256 indexed tokenId, string documentHash, address indexed stamper)"
];

export async function connectWallet() {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('MetaMask is not installed');
  }
  const ethereum = (window as any).ethereum;
  await ethereum.request({ method: 'eth_requestAccounts' });

  // Force switch to Polygon Amoy Testnet
  const AMOY_CHAIN_ID = '0x13882'; // 80002 in hex
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: AMOY_CHAIN_ID }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: AMOY_CHAIN_ID,
          chainName: 'Polygon Amoy Testnet',
          nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
          rpcUrls: ['https://rpc-amoy.polygon.technology/'],
          blockExplorerUrls: ['https://amoy.polygonscan.com/']
        }],
      });
    } else {
      throw switchError;
    }
  }

  const provider = new ethers.BrowserProvider(ethereum);
  const signer = await provider.getSigner();
  return { provider, signer };
}

export async function stampAuditOnChain(documentHash: string, uri: string = "") {
  try {
    const { signer } = await connectWallet();

    if (!process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
      throw new Error("Missing NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local. You must deploy the smart contract first!");
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
    
    // Send the transaction
    const tx = await contract.stampAudit(signer.address, uri, documentHash);
    const receipt = await tx.wait();
    
    return {
      success: true,
      transactionHash: receipt.hash,
    };
  } catch (error) {
    console.error("Blockchain stamp failed:", error);
    throw error;
  }
}
