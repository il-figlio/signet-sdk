import { z } from 'zod';

/**
 * RPC endpoint configuration schema
 */
export const RpcConfigSchema = z.object({
  host: z.string().url().describe('Host chain RPC URL'),
  signet: z.string().url().describe('Signet chain RPC URL'),
});

/**
 * Signer configuration schema
 */
export const SignerConfigSchema = z.object({
  type: z
    .enum(['private-key', 'ledger', 'keystore'])
    .describe('Signer type'),
  privateKeyEnv: z
    .string()
    .optional()
    .describe('Environment variable containing private key'),
  keystorePath: z.string().optional().describe('Path to keystore file'),
  derivationPath: z
    .string()
    .optional()
    .describe('Derivation path for hardware wallet'),
});

/**
 * Transaction Cache API configuration schema
 */
export const CacheConfigSchema = z.object({
  url: z.string().url().describe('Transaction Cache API URL'),
  apiKeyEnv: z
    .string()
    .optional()
    .describe('Environment variable containing API key'),
  timeout: z
    .number()
    .positive()
    .default(30000)
    .describe('Request timeout in milliseconds'),
});

/**
 * Full configuration schema for .signetrc.json
 */
export const ConfigSchema = z.object({
  rpcs: RpcConfigSchema,
  signer: SignerConfigSchema,
  cache: CacheConfigSchema,
  defaultChain: z
    .enum(['host', 'signet'])
    .default('host')
    .describe('Default chain for operations'),
});

export type RpcConfig = z.infer<typeof RpcConfigSchema>;
export type SignerConfig = z.infer<typeof SignerConfigSchema>;
export type CacheConfig = z.infer<typeof CacheConfigSchema>;
export type Config = z.infer<typeof ConfigSchema>;
