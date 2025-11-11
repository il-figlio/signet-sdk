import { Command, Flags } from '@oclif/core';
import { readFile } from 'fs/promises';
import { hashOrder, validateOrder } from '../../utils/eip712.js';
import { printSuccess, printError, printKeyValue } from '../../utils/output.js';
import { logger } from '../../logger.js';

/**
 * Compute deterministic hash of an order
 * TODO(signet-sdk): Use Signet SDK hash function
 */
export default class OrdersHash extends Command {
  static override description =
    'Compute deterministic EIP-712 hash of an order';

  static override examples = [
    '<%= config.bin %> <%= command.id %> -f order.json',
    '<%= config.bin %> <%= command.id %> --file order.json',
  ];

  static override flags = {
    file: Flags.string({
      char: 'f',
      description: 'Path to order JSON file',
      required: true,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(OrdersHash);

    try {
      // Read order file
      const content = await readFile(flags.file, 'utf-8');
      const order = JSON.parse(content);

      // Validate order structure
      if (!validateOrder(order)) {
        throw new Error(
          'Invalid order structure. Please ensure all required fields are present.'
        );
      }

      // Compute hash
      // TODO(signet-sdk): Replace with SDK hash function
      const hash = hashOrder(order);

      printSuccess('Order hash computed successfully');

      // Display order details and hash
      printKeyValue({
        'Order File': flags.file,
        'Chain ID': order.chainId,
        Recipient: order.recipient,
        Token: order.token,
        Amount: order.amount,
        Nonce: order.nonce,
        Deadline: order.deadline,
        'Order Hash': hash,
      });

      logger.info({ hash, file: flags.file }, 'Order hashed');
    } catch (error) {
      logger.error({ error, file: flags.file }, 'Failed to hash order');
      if (error instanceof Error) {
        printError(`Error: ${error.message}`);
      }
      this.exit(1);
    }
  }
}
