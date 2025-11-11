import { Command, Flags } from '@oclif/core';
import { input, select, confirm } from '@inquirer/prompts';
import { writeConfig, configExists } from '../../config/loader.js';
import type { Config } from '../../config/schema.js';
import { printSuccess, printError, printInfo } from '../../utils/output.js';
import { testRpcConnection } from '../../utils/rpc.js';
import { logger } from '../../logger.js';

/**
 * Interactive command to initialize .signetrc.json configuration
 */
export default class EnvInit extends Command {
  static override description =
    'Interactively create a .signetrc.json configuration file';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --force',
  ];

  static override flags = {
    force: Flags.boolean({
      char: 'f',
      description: 'Overwrite existing configuration',
      default: false,
    }),
    path: Flags.string({
      char: 'p',
      description: 'Custom path for config file',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(EnvInit);

    try {
      // Check if config already exists
      if (!flags.force && (await configExists())) {
        const shouldOverwrite = await confirm({
          message: 'Configuration file already exists. Overwrite?',
          default: false,
        });

        if (!shouldOverwrite) {
          printInfo('Configuration initialization cancelled');
          return;
        }
      }

      printInfo('Setting up Signet CLI configuration...\n');

      // RPC Configuration
      const hostRpc = await input({
        message: 'Host chain RPC URL:',
        default: 'https://mainnet.infura.io/v3/YOUR_KEY',
        validate: (value) => {
          try {
            new URL(value);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        },
      });

      // Test host RPC connection
      printInfo('Testing host RPC connection...');
      const hostConnected = await testRpcConnection(hostRpc);
      if (!hostConnected) {
        printError(
          'Warning: Could not connect to host RPC. Please verify the URL.'
        );
      }

      const signetRpc = await input({
        message: 'Signet chain RPC URL:',
        default: 'https://signet-rpc.example.com',
        validate: (value) => {
          try {
            new URL(value);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        },
      });

      // Signer Configuration
      const signerType = await select({
        message: 'Signer type:',
        choices: [
          { value: 'private-key', name: 'Private Key (from env variable)' },
          { value: 'ledger', name: 'Ledger (coming soon)', disabled: true },
          {
            value: 'keystore',
            name: 'Keystore file (coming soon)',
            disabled: true,
          },
        ],
      });

      let privateKeyEnv: string | undefined;
      let keystorePath: string | undefined;
      let derivationPath: string | undefined;

      if (signerType === 'private-key') {
        privateKeyEnv = await input({
          message: 'Environment variable name for private key:',
          default: 'PRIVATE_KEY',
          validate: (value) =>
            value.length > 0 ? true : 'Variable name cannot be empty',
        });
      }

      // Cache Configuration
      const cacheUrl = await input({
        message: 'Transaction Cache API URL:',
        default: 'https://cache.signet.example.com',
        validate: (value) => {
          try {
            new URL(value);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        },
      });

      const needsApiKey = await confirm({
        message: 'Does the cache API require an API key?',
        default: false,
      });

      let apiKeyEnv: string | undefined;
      if (needsApiKey) {
        apiKeyEnv = await input({
          message: 'Environment variable name for API key:',
          default: 'SIGNET_API_KEY',
          validate: (value) =>
            value.length > 0 ? true : 'Variable name cannot be empty',
        });
      }

      const cacheTimeout = await input({
        message: 'Cache API timeout (milliseconds):',
        default: '30000',
        validate: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num <= 0) {
            return 'Please enter a positive number';
          }
          return true;
        },
      });

      // Default chain
      const defaultChain = await select({
        message: 'Default chain for operations:',
        choices: [
          { value: 'host', name: 'Host Chain' },
          { value: 'signet', name: 'Signet Chain' },
        ],
      });

      // Build config object
      const config: Config = {
        rpcs: {
          host: hostRpc,
          signet: signetRpc,
        },
        signer: {
          type: signerType as 'private-key' | 'ledger' | 'keystore',
          privateKeyEnv,
          keystorePath,
          derivationPath,
        },
        cache: {
          url: cacheUrl,
          apiKeyEnv,
          timeout: parseInt(cacheTimeout, 10),
        },
        defaultChain: defaultChain as 'host' | 'signet',
      };

      // Write config
      const writtenPath = await writeConfig(config, flags.path);

      printSuccess(`Configuration written to: ${writtenPath}`);

      // Provide next steps
      console.log('\nNext steps:');
      if (privateKeyEnv) {
        console.log(`  1. Set ${privateKeyEnv} in your environment`);
      }
      if (apiKeyEnv) {
        console.log(`  2. Set ${apiKeyEnv} in your environment (if needed)`);
      }
      console.log('  3. Run: npx signet chains list');
      console.log('  4. Build an order: npx signet orders build\n');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize configuration');
      if (error instanceof Error) {
        printError(`Error: ${error.message}`);
      }
      this.exit(1);
    }
  }
}
