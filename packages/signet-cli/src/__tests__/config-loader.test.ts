import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { writeConfig, loadConfig } from '../config/loader.js';
import type { Config } from '../config/schema.js';

describe('Config Loader', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    testDir = join(tmpdir(), `signet-cli-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    configPath = join(testDir, '.signetrc.json');

    // Change to test directory
    process.chdir(testDir);
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await unlink(configPath);
    } catch {
      // Ignore if file doesn't exist
    }
  });

  it('should write valid config', async () => {
    const config: Config = {
      rpcs: {
        host: 'https://mainnet.infura.io/v3/test',
        signet: 'https://signet-rpc.example.com',
      },
      signer: {
        type: 'private-key',
        privateKeyEnv: 'PRIVATE_KEY',
      },
      cache: {
        url: 'https://cache.example.com',
        timeout: 30000,
      },
      defaultChain: 'host',
    };

    const path = await writeConfig(config, configPath);
    expect(path).toBe(configPath);
  });

  it('should load and validate config', async () => {
    const config: Config = {
      rpcs: {
        host: 'https://mainnet.infura.io/v3/test',
        signet: 'https://signet-rpc.example.com',
      },
      signer: {
        type: 'private-key',
        privateKeyEnv: 'PRIVATE_KEY',
      },
      cache: {
        url: 'https://cache.example.com',
        timeout: 30000,
      },
      defaultChain: 'signet',
    };

    await writeConfig(config, configPath);
    const loaded = await loadConfig();

    expect(loaded.rpcs.host).toBe(config.rpcs.host);
    expect(loaded.rpcs.signet).toBe(config.rpcs.signet);
    expect(loaded.defaultChain).toBe('signet');
  });

  it('should reject invalid config', async () => {
    const invalidConfig = {
      rpcs: {
        host: 'not-a-url',
        signet: 'also-not-a-url',
      },
    };

    await writeFile(configPath, JSON.stringify(invalidConfig), 'utf-8');

    await expect(loadConfig()).rejects.toThrow();
  });
});
