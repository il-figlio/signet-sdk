import { createPublicClient, createWalletClient, http, type PublicClient, type WalletClient, type Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { RpcConfig } from '../config/schema.js';
import { logger } from '../logger.js';

/**
 * Known chain configurations
 * TODO(signet-sdk): Import from Signet SDK when available
 */
export const KNOWN_CHAINS: Record<string, Chain> = {
  // Placeholder chain definitions
  // These should be replaced with actual chain definitions from Signet SDK
};

/**
 * Create a public client for reading chain data
 */
export function createRpcPublicClient(url: string): PublicClient {
  logger.debug({ url }, 'Creating public RPC client');

  return createPublicClient({
    transport: http(url, {
      timeout: 30_000,
    }),
  });
}

/**
 * Create wallet client for signing transactions
 * TODO(signet-sdk): Support additional signer types (ledger, keystore)
 */
export function createRpcWalletClient(
  url: string,
  privateKey: `0x${string}`
): WalletClient {
  logger.debug({ url }, 'Creating wallet RPC client');

  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    account,
    transport: http(url, {
      timeout: 30_000,
    }),
  });
}

/**
 * Get both host and signet public clients from config
 */
export function getPublicClients(rpcs: RpcConfig): {
  host: PublicClient;
  signet: PublicClient;
} {
  return {
    host: createRpcPublicClient(rpcs.host),
    signet: createRpcPublicClient(rpcs.signet),
  };
}

/**
 * Get private key from environment
 */
export function getPrivateKeyFromEnv(envVar: string): `0x${string}` {
  const key = process.env[envVar];

  if (!key) {
    throw new Error(
      `Private key not found in environment variable: ${envVar}`
    );
  }

  // Ensure it starts with 0x
  const normalized = key.startsWith('0x') ? key : `0x${key}`;

  if (!/^0x[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error(
      `Invalid private key format in ${envVar}. Expected 64 hex characters.`
    );
  }

  return normalized as `0x${string}`;
}

/**
 * Test RPC connection
 */
export async function testRpcConnection(url: string): Promise<boolean> {
  try {
    const client = createRpcPublicClient(url);
    await client.getBlockNumber();
    return true;
  } catch (error) {
    logger.error({ url, error }, 'RPC connection failed');
    return false;
  }
}
