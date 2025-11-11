import { readFile, writeFile, access } from 'fs/promises';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { Config, ConfigSchema } from './schema.js';
import { logger } from '../logger.js';

const CONFIG_FILENAME = '.signetrc.json';

/**
 * Search for config file in multiple locations:
 * 1. Current directory
 * 2. Parent directories (walk up)
 * 3. Home directory
 */
export async function findConfigPath(): Promise<string | null> {
  const searchPaths: string[] = [];

  // Start from current directory and walk up
  let currentDir = process.cwd();
  const root = resolve('/');

  while (true) {
    searchPaths.push(join(currentDir, CONFIG_FILENAME));
    if (currentDir === root) break;
    currentDir = resolve(currentDir, '..');
  }

  // Add home directory
  searchPaths.push(join(homedir(), CONFIG_FILENAME));

  // Check each path
  for (const path of searchPaths) {
    try {
      await access(path);
      logger.debug({ path }, 'Found config file');
      return path;
    } catch {
      // File doesn't exist, continue searching
    }
  }

  return null;
}

/**
 * Load and validate configuration from file
 */
export async function loadConfig(): Promise<Config> {
  const configPath = await findConfigPath();

  if (!configPath) {
    throw new Error(
      `Configuration file ${CONFIG_FILENAME} not found. Run 'signet env init' to create one.`
    );
  }

  try {
    const content = await readFile(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    const validated = ConfigSchema.parse(parsed);

    logger.debug({ configPath }, 'Loaded configuration');
    return validated;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${configPath}: ${error.message}`);
    }
    if (error instanceof Error && 'issues' in error) {
      // Zod validation error
      throw new Error(
        `Invalid configuration in ${configPath}: ${error.message}`
      );
    }
    throw error;
  }
}

/**
 * Write configuration to file
 */
export async function writeConfig(
  config: Config,
  path?: string
): Promise<string> {
  const targetPath = path || join(process.cwd(), CONFIG_FILENAME);

  // Validate before writing
  const validated = ConfigSchema.parse(config);

  const content = JSON.stringify(validated, null, 2);
  await writeFile(targetPath, content, 'utf-8');

  logger.info({ path: targetPath }, 'Configuration written');
  return targetPath;
}

/**
 * Check if config file exists
 */
export async function configExists(): Promise<boolean> {
  const path = await findConfigPath();
  return path !== null;
}
