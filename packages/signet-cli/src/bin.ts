#!/usr/bin/env node

/**
 * Signet CLI entry point
 * Handles top-level error catching and reporting
 */

import { execute } from '@oclif/core';
import { logger } from './logger.js';

async function main() {
  try {
    await execute({ dir: import.meta.url });
  } catch (error) {
    // Log error for debugging
    logger.error({ error }, 'Unhandled error in CLI execution');

    // Print user-friendly error message
    if (error instanceof Error) {
      console.error(`\n❌ Error: ${error.message}\n`);

      // Show stack trace in debug mode
      if (process.env.DEBUG) {
        console.error(error.stack);
      } else {
        console.error('Run with DEBUG=1 for detailed error information.\n');
      }
    } else {
      console.error('\n❌ An unexpected error occurred.\n');
    }

    process.exit(1);
  }
}

main();
