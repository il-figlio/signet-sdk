# Signet CLI

A production-ready TypeScript CLI for interacting with the Signet SDK. Build, sign, and submit orders to the Signet transaction system with ease.

## Features

- Interactive configuration setup
- Chain management and RPC integration
- Order building with validation
- EIP-712 signature generation
- Transaction cache submission
- Comprehensive logging (JSON/pretty formats)
- TypeScript with full type safety

## Installation

```bash
npm install @figliozzi/signet-cli
```

Or use directly with npx:

```bash
npx signet --help
```

## Quick Start

### 1. Initialize Configuration

Create a `.signetrc.json` configuration file interactively:

```bash
npx signet env init
```

This will prompt you for:
- Host and Signet chain RPC URLs
- Signer configuration (private key, ledger, keystore)
- Transaction Cache API settings
- Default chain preference

Example `.signetrc.json`:

```json
{
  "rpcs": {
    "host": "https://mainnet.infura.io/v3/YOUR_KEY",
    "signet": "https://signet-rpc.example.com"
  },
  "signer": {
    "type": "private-key",
    "privateKeyEnv": "PRIVATE_KEY"
  },
  "cache": {
    "url": "https://cache.signet.example.com",
    "timeout": 30000
  },
  "defaultChain": "host"
}
```

### 2. Set Environment Variables

```bash
export PRIVATE_KEY="0x..."
export SIGNET_API_KEY="your-api-key"  # if required
```

### 3. Verify Chain Connections

```bash
npx signet chains list
```

## Usage Examples

### List Available Chains

View configured chains with connection status:

```bash
npx signet chains list
npx signet chains list --json
```

### Build an Order

Create an unsigned order interactively:

```bash
npx signet orders build
npx signet orders build --output my-order.json
```

This will prompt for:
- Chain selection
- Recipient address
- Token address
- Amount (in wei)
- Nonce
- Deadline

### Hash an Order

Compute the deterministic EIP-712 hash:

```bash
npx signet orders hash -f order.json
```

Output:
```
✓ Order hash computed successfully
┌──────────────┬────────────────────────────────────────────────┐
│ Order File   │ order.json                                     │
│ Chain ID     │ 1                                              │
│ Recipient    │ 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb      │
│ Token        │ 0x0000000000000000000000000000000000000000    │
│ Amount       │ 1000000000000000000                            │
│ Nonce        │ 12345                                          │
│ Deadline     │ 1700000000                                     │
│ Order Hash   │ 0xabc123...                                    │
└──────────────┴────────────────────────────────────────────────┘
```

### Sign an Order

Sign an order with EIP-712:

```bash
npx signet orders sign -f order.json
npx signet orders sign -f order.json --output custom.signed.json
```

Output:
```
✓ Order signed successfully
Signed by: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Hash: 0xabc123...
Signature: 0xdef456...
Output: order.signed.json

Next steps:
  Submit to cache: npx signet orders submit -f order.signed.json
```

### Submit an Order

Submit a signed order to the Transaction Cache:

```bash
npx signet orders submit -f order.signed.json
npx signet orders submit -f order.signed.json --idempotency-key my-unique-key
```

Output:
```
✓ Order submitted successfully
┌──────────────────┬────────────────────────────────────────────┐
│ Order Hash       │ 0xabc123...                                │
│ Status           │ 200                                        │
│ Cache Response   │ { "id": "...", "status": "pending" }      │
└──────────────────┴────────────────────────────────────────────┘
```

## Environment Variables

### Required

- `PRIVATE_KEY` - Your Ethereum private key (if using private-key signer)

### Optional

- `LOG_LEVEL` - Logging level: `trace`, `debug`, `info`, `warn`, `error` (default: `info`)
- `LOG_FORMAT` - Output format: `json` or `pretty` (default: `pretty`)
- `SIGNET_API_KEY` - Transaction Cache API key (if required by your cache)
- `DEBUG` - Set to `1` for detailed error stack traces

## Configuration

The CLI searches for `.signetrc.json` in:
1. Current directory
2. Parent directories (walking up)
3. Home directory (`~/.signetrc.json`)

### Configuration Schema

```typescript
{
  rpcs: {
    host: string;      // Host chain RPC URL
    signet: string;    // Signet chain RPC URL
  };
  signer: {
    type: 'private-key' | 'ledger' | 'keystore';
    privateKeyEnv?: string;      // Env var with private key
    keystorePath?: string;       // Path to keystore file
    derivationPath?: string;     // HD wallet derivation path
  };
  cache: {
    url: string;                 // Transaction Cache API URL
    apiKeyEnv?: string;          // Env var with API key
    timeout: number;             // Request timeout (ms)
  };
  defaultChain: 'host' | 'signet';
}
```

## Development

### Build

```bash
npm run build
```

### Development Mode

```bash
npm run dev -- orders build
```

### Testing

```bash
npm test
npm run test:watch
```

### Linting

```bash
npm run lint
```

### Type Checking

```bash
npm run typecheck
```

## Architecture

```
packages/signet-cli/
├── src/
│   ├── bin.ts              # CLI entry point with error handling
│   ├── index.ts            # Exports for programmatic use
│   ├── logger.ts           # Pino logger configuration
│   ├── config/
│   │   ├── schema.ts       # Zod validation schemas
│   │   └── loader.ts       # Config file discovery and loading
│   ├── utils/
│   │   ├── output.ts       # CLI table formatting helpers
│   │   ├── rpc.ts          # Viem RPC client creation
│   │   └── eip712.ts       # EIP-712 types and hashing
│   └── commands/
│       ├── env/
│       │   └── init.ts     # Interactive config setup
│       ├── chains/
│       │   └── list.ts     # List configured chains
│       └── orders/
│           ├── build.ts    # Build unsigned orders
│           ├── hash.ts     # Hash orders
│           ├── sign.ts     # Sign orders with EIP-712
│           └── submit.ts   # Submit to Transaction Cache
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Integration with Signet SDK

This CLI contains placeholder implementations marked with `TODO(signet-sdk)` comments. These indicate where the actual Signet SDK should be integrated:

1. **EIP-712 Types** (`utils/eip712.ts`): Replace with SDK's order types and domain
2. **Order Hashing** (`utils/eip712.ts`): Use SDK's deterministic hash function
3. **Order Signing** (`commands/orders/sign.ts`): Use SDK's EIP-712 signing
4. **Order Validation** (`utils/eip712.ts`): Use SDK's validation logic
5. **Chain Definitions** (`utils/rpc.ts`): Import chain configs from SDK
6. **Cache Client** (`commands/orders/submit.ts`): Use SDK's cache client

## Logging

### Pretty Format (Default)

```bash
npx signet chains list
```

Output:
```
[10:30:45] INFO: Loading configuration from .signetrc.json
[10:30:45] DEBUG: Creating RPC clients
```

### JSON Format

```bash
LOG_FORMAT=json npx signet chains list
```

Output:
```json
{"level":"info","time":1699876845,"msg":"Loading configuration"}
{"level":"debug","time":1699876845,"msg":"Creating RPC clients"}
```

## Error Handling

The CLI provides clear error messages and exits with appropriate codes:

```bash
npx signet orders sign -f missing.json
# ✗ Error: ENOENT: no such file or directory
# Run with DEBUG=1 for detailed error information.

DEBUG=1 npx signet orders sign -f missing.json
# ✗ Error: ENOENT: no such file or directory
# Error: ENOENT: no such file or directory, open 'missing.json'
#   at Object.openSync (node:fs:...)
#   ...
```

## License

MIT

## Contributing

Contributions welcome! Please ensure:
- All tests pass (`npm test`)
- Code is properly typed (`npm run typecheck`)
- Linting passes (`npm run lint`)
- Add tests for new functionality

## Support

For issues and questions, please open an issue on GitHub.
