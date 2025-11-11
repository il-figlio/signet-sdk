import Table from 'cli-table3';

/**
 * Print a formatted table to stdout
 */
export function printTable(
  headers: string[],
  rows: (string | number)[][]
): void {
  const table = new Table({
    head: headers,
    style: {
      head: ['cyan', 'bold'],
      border: ['gray'],
    },
    colWidths: undefined, // Auto-calculate
    wordWrap: true,
  });

  table.push(...rows);
  console.log(table.toString());
}

/**
 * Print a key-value table (2 columns)
 */
export function printKeyValue(data: Record<string, string | number>): void {
  const table = new Table({
    style: {
      head: [],
      border: ['gray'],
    },
    colWidths: [30, undefined],
    wordWrap: true,
  });

  for (const [key, value] of Object.entries(data)) {
    table.push([key, String(value)]);
  }

  console.log(table.toString());
}

/**
 * Print formatted JSON output
 */
export function printJson(data: unknown): void {
  console.log(JSON.stringify(data, null, 2));
}

/**
 * Print success message in green
 */
export function printSuccess(message: string): void {
  console.log(`\x1b[32m✓ ${message}\x1b[0m`);
}

/**
 * Print error message in red
 */
export function printError(message: string): void {
  console.error(`\x1b[31m✗ ${message}\x1b[0m`);
}

/**
 * Print warning message in yellow
 */
export function printWarning(message: string): void {
  console.warn(`\x1b[33m⚠ ${message}\x1b[0m`);
}

/**
 * Print info message
 */
export function printInfo(message: string): void {
  console.log(`\x1b[36mℹ ${message}\x1b[0m`);
}
