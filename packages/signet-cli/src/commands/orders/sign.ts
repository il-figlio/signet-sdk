import { Command, Flags } from '@oclif/core';
import { readFile, writeFile } from 'fs/promises';
import { loadConfig } from '../../config/loader.js';
import { getPrivateKeyFromEnv } from '../../utils/rpc.js';
import {
  hashOrder,
  validateOrder,
  type OrderSignature,
} from '../../utils/eip712.js';
import { printSuccess, printError, printWarning } from '../../utils/output.js';
import { logger } from '../../logger.js';
import { privateKeyToAccount } from 'viem/accounts';

/**
 * Sign an order with EIP-712
 * TODO(signet-sdk): Use Signet SDK signing functionality
 */
export default class OrdersSign extends Command {
  static override description =
    'Sign an order using EIP-712 (requires configured signer)';

  static override examples = [
    '<%= config.bin %> <%= command.id %> -f order.json',
    '<%= config.bin %> <%= command.id %> --file order.json --output order.signed.json',
  ];

  static override flags = {
    file: Flags.string({
      char: 'f',
      description: 'Path to order JSON file',
      required: true,
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output file for signed order',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(OrdersSign);

    try {
      const config = await loadConfig();

      // Read and validate order
      const content = await readFile(flags.file, 'utf-8');
      const order = JSON.parse(content);

      if (!validateOrder(order)) {
        throw new Error(
          'Invalid order structure. Please ensure all required fields are present.'
        );
      }

      // Get signer
      if (config.signer.type !== 'private-key') {
        throw new Error(
          'Only private-key signer is currently supported. Please update your configuration.'
        );
      }

      if (!config.signer.privateKeyEnv) {
        throw new Error(
          'Private key environment variable not configured. Run: signet env init'
        );
      }

      const privateKey = getPrivateKeyFromEnv(config.signer.privateKeyEnv);
      const account = privateKeyToAccount(privateKey);

      printWarning(
        'TODO: This uses placeholder EIP-712 signing. Replace with Signet SDK.'
      );

      // TODO(signet-sdk): Replace this with actual Signet SDK EIP-712 signing
      // For now, we'll create a simple placeholder signature
      const hash = hashOrder(order);

      // Placeholder: In production, use proper EIP-712 typed data signing
      // const signature = await account.signTypedData({
      //   domain: EIP712_DOMAIN,
      //   types: EIP712_TYPES,
      //   primaryType: 'SignetOrder',
      //   message: order,
      // });

      // For now, just sign the hash as a message (NOT CORRECT FOR PRODUCTION)
      const signature = await account.signMessage({
        message: { raw: hash as `0x${string}` },
      });

      const signedOrder: OrderSignature = {
        order,
        signature,
        hash,
      };

      // Determine output file
      const outputFile =
        flags.output || flags.file.replace('.json', '.signed.json');

      // Write signed order
      await writeFile(
        outputFile,
        JSON.stringify(signedOrder, null, 2),
        'utf-8'
      );

      printSuccess(`Order signed successfully`);
      console.log(`Signed by: ${account.address}`);
      console.log(`Hash: ${hash}`);
      console.log(`Signature: ${signature}`);
      console.log(`Output: ${outputFile}`);

      console.log('\nNext steps:');
      console.log(`  Submit to cache: npx signet orders submit -f ${outputFile}`);

      logger.info({ hash, signer: account.address }, 'Order signed');
    } catch (error) {
      logger.error({ error, file: flags.file }, 'Failed to sign order');
      if (error instanceof Error) {
        printError(`Error: ${error.message}`);
      }
      this.exit(1);
    }
  }
}
