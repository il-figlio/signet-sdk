import { Command, Flags } from '@oclif/core';
import { loadConfig } from '../../config/loader.js';
import { getPublicClients } from '../../utils/rpc.js';
import { printTable, printError, printJson } from '../../utils/output.js';
import { logger } from '../../logger.js';

/**
 * List known chains and their configuration
 */
export default class ChainsList extends Command {
  static override description =
    'List configured chains (host and signet) with connection status';

  static override examples = [
    '<%= config.bin %> <%= command.id %>',
    '<%= config.bin %> <%= command.id %> --json',
  ];

  static override flags = {
    json: Flags.boolean({
      char: 'j',
      description: 'Output in JSON format',
      default: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(ChainsList);

    try {
      const config = await loadConfig();
      const clients = getPublicClients(config.rpcs);

      // Fetch chain info
      const chains = await Promise.all([
        this.getChainInfo('host', config.rpcs.host, clients.host),
        this.getChainInfo('signet', config.rpcs.signet, clients.signet),
      ]);

      if (flags.json) {
        printJson({
          chains,
          defaultChain: config.defaultChain,
        });
      } else {
        const rows = chains.map((chain) => [
          chain.name,
          chain.rpcUrl,
          chain.chainId?.toString() || 'N/A',
          chain.blockNumber?.toString() || 'N/A',
          chain.connected ? '✓' : '✗',
        ]);

        console.log('Configured Chains:\n');
        printTable(
          ['Chain', 'RPC URL', 'Chain ID', 'Block Number', 'Connected'],
          rows
        );

        console.log(`\nDefault chain: ${config.defaultChain}`);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to list chains');
      if (error instanceof Error) {
        printError(`Error: ${error.message}`);
      }
      this.exit(1);
    }
  }

  private async getChainInfo(
    name: string,
    rpcUrl: string,
    client: any
  ): Promise<{
    name: string;
    rpcUrl: string;
    chainId?: number;
    blockNumber?: bigint;
    connected: boolean;
  }> {
    try {
      const [chainId, blockNumber] = await Promise.all([
        client.getChainId(),
        client.getBlockNumber(),
      ]);

      return {
        name,
        rpcUrl,
        chainId,
        blockNumber,
        connected: true,
      };
    } catch (error) {
      logger.warn({ name, rpcUrl, error }, 'Failed to connect to chain');
      return {
        name,
        rpcUrl,
        connected: false,
      };
    }
  }
}
