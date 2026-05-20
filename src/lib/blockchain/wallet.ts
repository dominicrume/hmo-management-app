// Client-side wallet utilities — MetaMask connection + challenge signing.
// Server-side: use stamp.ts instead.

import { ethers } from 'ethers';

export const AMOY_CHAIN_ID   = '0x13882'; // Polygon Amoy Testnet (80002)
export const AMOY_CHAIN_NAME = 'Polygon Amoy Testnet';

export interface WalletConnection {
  provider: ethers.BrowserProvider;
  signer:   ethers.JsonRpcSigner;
  address:  string;
}

/**
 * Connects MetaMask and switches to Polygon Amoy.
 * Prompts the user to add the network if not already configured.
 */
export async function connectWallet(): Promise<WalletConnection> {
  if (typeof window === 'undefined' || !(window as unknown as { ethereum?: unknown }).ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const ethereum = (window as unknown as { ethereum: { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }).ethereum;
  await ethereum.request({ method: 'eth_requestAccounts' });

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: AMOY_CHAIN_ID }],
    });
  } catch (switchError: unknown) {
    const err = switchError as { code?: number };
    if (err?.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId:          AMOY_CHAIN_ID,
          chainName:        AMOY_CHAIN_NAME,
          nativeCurrency:   { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
          rpcUrls:          ['https://rpc-amoy.polygon.technology/'],
          blockExplorerUrls: ['https://amoy.polygonscan.com/'],
        }],
      });
    } else {
      throw switchError;
    }
  }

  const provider = new ethers.BrowserProvider(ethereum as unknown as ethers.Eip1193Provider);
  const signer   = await provider.getSigner();
  const address  = await signer.getAddress();
  return { provider, signer, address };
}

/**
 * Signs a challenge message with the connected wallet.
 * Used in the wallet authentication flow.
 */
export async function signChallenge(signer: ethers.JsonRpcSigner, challenge: string): Promise<string> {
  return signer.signMessage(challenge);
}

/**
 * Recovers the address that signed a message.
 * Can be called client or server side (no wallet required).
 */
export function recoverAddress(message: string, signature: string): string {
  return ethers.verifyMessage(message, signature);
}
