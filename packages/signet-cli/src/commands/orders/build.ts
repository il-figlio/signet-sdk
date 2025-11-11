import { Command, Flags } from '@oclif/core';
import { input, select } from '@inquirer/prompts';
import { writeFile } from 'fs/promises';
import { loadConfig } from '../../config/loader.js';
import { getPublicClients } from '../../utils/rpc.js';
import type { SignetOrder } from '../../utils/eip712.js';
import { printSuccess, printError, printJson } from '../../utils/output.js';
import { logger } from '../../logger.js';

/**
 * Interactive command to build an unsigned order JSON
 * TODO(signet-sdk): Use Signet SDK order builder and validation
 */
export default class OrdersBuild extends Command {
  static override description =
    'Interactively build an unsigned Signet order and save to JSON';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --output my-order.json',
  ];

  static override flags = {
    output: Flags.string({
      char: 'o',
      description: 'Output file path for the order JSON',
      default: 'order.json',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(OrdersBuild);

    try {
      const config = await loadConfig();
      const clients = getPublicClients(config.rpcs);

      console.log('Building a new Signet order...\n');

      // Select chain
      const chain = await select({
        message: 'Select chain:',
        choices: [
          { value: 'host', name: 'Host Chain' },
          { value: 'signet', name: 'Signet Chain' },
        ],
        default: config.defaultChain,
      });

      // Get chain ID
      const client = chain === 'host' ? clients.host : clients.signet;
      const chainId = await client.getChainId();

      // TODO(signet-sdk): Replace these prompts with actual Signet order fields
      const recipient = await input({
        message: 'Recipient address:',
        validate: (value) => {
          if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
            return 'Please enter a valid Ethereum address (0x...)';
          }
          return true;
        },
      });

      const token = await input({
        message: 'Token address (or 0x0 for ETH):',
        default: '0x0000000000000000000000000000000000000000',
        validate: (value) => {
          if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
            return 'Please enter a valid Ethereum address (0x...)';
          }
          return true;
        },
      });

      const amount = await input({
        message: 'Amount (in wei):',
        validate: (value) => {
          if (!/^\d+$/.test(value)) {
            return 'Please enter a valid number (wei)';
          }
          return true;
        },
      });

      const nonce = await input({
        message: 'Nonce:',
        default: Date.now().toString(),
        validate: (value) => {
          if (!/^\d+$/.test(value)) {
            return 'Please enter a valid number';
          }
          return true;
        },
      });

      const deadlineInput = await input({
        message: 'Deadline (Unix timestamp, or leave empty for +1 hour):',
        default: '',
      });

      const deadline = deadlineInput
        ? parseInt(deadlineInput, 10)
        : Math.floor(Date.now() / 1000) + 3600;

      // Build order object
      // TODO(signet-sdk): Use actual Signet SDK order builder
      const order: SignetOrder = {
        chainId,
        recipient,
        token,
        amount,
        nonce,
        deadline,
      };

      // Write to file
      await writeFile(flags.output, JSON.stringify(order, null, 2), 'utf-8');

      printSuccess(`Order saved to: ${flags.output}`);
      console.log('\nOrder details:');
      printJson(order);

      console.log('\nNext steps:');
      console.log(`  1. Review the order: cat ${flags.output}`);
      console.log(`  2. Hash the order: npx signet orders hash -f ${flags.output}`);
      console.log(`  3. Sign the order: npx signet orders sign -f ${flags.output}`);
    } catch (error) {
      logger.error({ error }, 'Failed to build order');
      if (error instanceof Error) {
        printError(`Error: ${error.message}`);
      }
      this.exit(1);
    }
  }
}
