import { Command, Flags } from '@oclif/core';
import { readFile } from 'fs/promises';
import { loadConfig } from '../../config/loader.js';
import type { OrderSignature } from '../../utils/eip712.js';
import { printSuccess, printError, printKeyValue } from '../../utils/output.js';
import { logger } from '../../logger.js';

/**
 * Submit signed order to Transaction Cache API
 * TODO(signet-sdk): Use Signet SDK cache client
 */
export default class OrdersSubmit extends Command {
  static override description =
    'Submit a signed order to the Transaction Cache API';

  static override examples = [
    '<%= config.bin %> <%= command.id %> -f order.signed.json',
    '<%= config.bin %> <%= command.id %> --file order.signed.json --idempotency-key my-unique-key',
  ];

  static override flags = {
    file: Flags.string({
      char: 'f',
      description: 'Path to signed order JSON file',
      required: true,
    }),
    'idempotency-key': Flags.string({
      char: 'k',
      description: 'Idempotency key for the request (prevents duplicates)',
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(OrdersSubmit);

    try {
      const config = await loadConfig();

      // Read signed order
      const content = await readFile(flags.file, 'utf-8');
      const signedOrder: OrderSignature = JSON.parse(content);

      // Validate structure
      if (
        !signedOrder.order ||
        !signedOrder.signature ||
        !signedOrder.hash
      ) {
        throw new Error(
          'Invalid signed order structure. Please ensure the file contains order, signature, and hash.'
        );
      }

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Add API key if configured
      if (config.cache.apiKeyEnv) {
        const apiKey = process.env[config.cache.apiKeyEnv];
        if (apiKey) {
          headers['x-api-key'] = apiKey;
        } else {
          logger.warn(
            { envVar: config.cache.apiKeyEnv },
            'API key environment variable not set'
          );
        }
      }

      // Add idempotency key if provided
      if (flags['idempotency-key']) {
        headers['idempotency-key'] = flags['idempotency-key'];
      }

      // Submit to cache API
      // TODO(signet-sdk): Use Signet SDK cache client
      logger.info({ url: config.cache.url }, 'Submitting order to cache');

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.cache.timeout
      );

      try {
        const response = await fetch(config.cache.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(signedOrder),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `Cache API returned ${response.status}: ${errorText}`
          );
        }

        const result = await response.json();

        printSuccess('Order submitted successfully');

        printKeyValue({
          'Order Hash': signedOrder.hash,
          Status: response.status,
          'Cache Response': JSON.stringify(result, null, 2),
        });

        logger.info(
          { hash: signedOrder.hash, response: result },
          'Order submitted'
        );
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      logger.error({ error, file: flags.file }, 'Failed to submit order');

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          printError('Request timed out. Please try again.');
        } else {
          printError(`Error: ${error.message}`);
        }
      }

      this.exit(1);
    }
  }
}
