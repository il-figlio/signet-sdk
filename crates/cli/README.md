# Signet CLI

```
   _____ _                  _
  / ____(_)                | |
 | (___  _  __ _ _ __   ___| |_
  \___ \| |/ _` | '_ \ / _ \ __|
  ____) | | (_| | | | |  __/ |_
 |_____/|_|\__, |_| |_|\___|\__|
            __/ |
           |___/

  A pragmatic Ethereum rollup
```

A beautiful, modern command-line tool for testing and interacting with the Signet SDK features.

## Features

The Signet CLI provides an intuitive, aesthetically pleasing interface to test various SDK features:

- 🎨 **Beautiful colored output** with smart terminal detection
- 📊 **Formatted tables** for displaying constants and configuration
- ⏳ **Progress indicators** for async operations
- ✨ **Clean visual hierarchy** with sections, headers, and icons
- 🚀 **Intuitive commands** with helpful aliases

### Core Functionality

- **Pecorino Quickstart**: Complete reference for Signet Pecorino network including chain IDs, contract addresses, and token addresses for both host and rollup chains
- **Transaction Cache Operations**: Interact with Signet's transaction cache
- **Fill Creation**: Create unsigned fills using the builder pattern
- **Transaction Signing**: Sign test transactions
- **Bundle Creation**: Create and display Signet bundles

## Installation

Build and install the CLI from the workspace root:

```bash
cargo build --release -p signet-cli
```

The binary will be available at `target/release/signet-cli` or just `signet`.

## Usage

All commands support colored output and beautiful formatting. Use `--no-color` to disable colors.

### Pecorino Quickstart Reference

Display complete Signet Pecorino configuration with beautifully formatted tables showing:
- Network names (Host and Rollup)
- Chain IDs
- All contract addresses (Zenith, Transactor, Orders, Passage)
- Host tokens (USDC, USDT, WBTC, WETH)
- Rollup tokens (Wrapped USD, WBTC, WETH)
- Base fee recipient
- Transaction cache URL

```bash
signet constants
# or use the alias
signet const
```

This provides everything you need to get started with Signet Pecorino!

Output in JSON format:

```bash
signet constants --json
```

### Transaction Cache Operations

#### Show the default Pecorino tx-cache URL:

```bash
signet tx-cache url
# or use the alias
signet cache url
```

#### Get transactions from the cache:

```bash
signet tx-cache get-transactions
# or use aliases
signet cache get-txs
```

Features:
- 🔄 Animated spinner during network requests
- ✓ Success indicators with transaction counts
- 📋 Clean formatting for transaction details

With a custom URL:

```bash
signet tx-cache get-transactions --url https://custom-cache-url.com
```

#### Get orders from the cache:

```bash
signet tx-cache get-orders
# or
signet cache get-orders
```

#### Send a test transaction to the cache:

```bash
signet tx-cache send-transaction \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --value 1000000000000000000

# or use alias
signet cache send -p 0xac09... -t 0x7099... -v 1000000000000000000
```

Features:
- 🔐 Transaction signing with progress indicator
- 📤 Animated upload to cache
- ✓ Success confirmation with response details
- 🎨 Color-coded addresses and values

### Create an Unsigned Fill

Create an unsigned fill using the builder pattern with beautiful output:

```bash
signet create-fill \
  --rollup-chain-id 1337 \
  --target-chain-id 1 \
  --order-contract 0x1234567890123456789012345678901234567890 \
  --deadline 1735689600 \
  --nonce 42

# or use alias
signet fill -r 1337 -t 1 -o 0x1234... -d 1735689600 -n 42
```

Features:
- 📝 Clear parameter display with color coding
- ⚙️ Progress indicator during fill creation
- 💡 Helpful hints about the builder pattern
- 🎨 JSON syntax highlighting

### Sign a Test Transaction

Sign a transaction and display the signed envelope:

```bash
signet sign-tx \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --to 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 \
  --value 1000000000000000000 \
  --chain-id 1

# or use alias
signet sign -p 0xac09... -t 0x7099... -v 1000000000000000000 -c 1
```

Features:
- 🎨 Color-coded addresses (yellow) and values (green)
- 🔄 Signing progress indicator
- ✓ Success confirmation
- 📋 Formatted envelope display

### Create a Bundle

Create and display a Signet bundle with workflow guidance:

```bash
signet create-bundle

# with fill guidance
signet create-bundle --with-fill

# or use alias
signet bundle -w
```

Features:
- 📦 Bundle structure visualization
- 💡 Step-by-step workflow guidance
- 🎨 Numbered, color-coded steps
- ✨ Clean JSON output

## Visual Design

The Signet CLI features a modern, professional design that reflects Signet's "pragmatic" philosophy:

### Color Palette

- **Cyan**: Brand color for headers, logos, and primary elements
- **Blue**: Labels and informational text
- **Yellow**: Addresses and identifiers
- **Green**: Values, success indicators, and confirmations
- **Dimmed/Gray**: Helper text and separators

### UI Elements

- ✓ Success checkmarks
- ▸ Section headers
- 💡 Helpful hints and tips
- ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ Animated spinners
- ─ Visual separators
- 📊 UTF-8 bordered tables

### Smart Features

- Automatic color detection (respects terminal capabilities)
- `--no-color` flag for CI/CD environments
- Consistent spacing and indentation
- Clear visual hierarchy

## Command Reference

### Aliases

Every command has short aliases for faster typing:

- `constants` → `const`
- `tx-cache` → `cache`
- `create-fill` → `fill`
- `sign-tx` → `sign`
- `create-bundle` → `bundle`
- `get-transactions` → `get-txs`
- `send-transaction` → `send`

### Global Options

- `--no-color` - Disable colored output
- `--help` - Show help information
- `--version` - Show version information

### Environment Variables

- `RUST_LOG` - Control logging verbosity (e.g., `RUST_LOG=debug signet constants`)

## Examples

### Testing the SDK Workflow

1. **Check system constants:**
   ```bash
   signet const
   ```

2. **Create an unsigned fill with the builder pattern:**
   ```bash
   signet fill -r 1337 -t 1 -o 0x1234567890123456789012345678901234567890
   ```

3. **Sign a test transaction:**
   ```bash
   signet sign \
     -p 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
     -t 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
   ```

4. **Query the transaction cache:**
   ```bash
   signet cache get-txs
   ```

### CI/CD Usage

Disable colors for CI/CD environments:

```bash
signet constants --no-color --json > constants.json
```

## Development

### Dependencies

The CLI uses the following crates for visual excellence:

- **owo-colors** - Modern colored output with terminal detection
- **comfy-table** - Beautiful UTF-8 tables
- **indicatif** - Progress bars and spinners
- **clap** - Command-line argument parsing

### SDK Crates

- `signet-constants` - System constants
- `signet-types` - Core types (UnsignedFill, SignedOrder, etc.)
- `signet-tx-cache` - Transaction cache client
- `signet-bundle` - Bundle types and utilities
- `signet-zenith` - Contract bindings

## Design Philosophy

The Signet CLI embodies Signet's "pragmatic" approach:

- **Clean & Minimal** - No unnecessary output, just what you need
- **Professional** - Production-ready aesthetics and UX
- **Helpful** - Contextual hints and clear error messages
- **Fast** - Efficient operations with progress feedback
- **Modern** - Contemporary design that feels native to your terminal

## Notes

- Private keys in examples are test keys (e.g., from Hardhat) - never use real private keys
- Transaction cache operations connect to Pecorino by default
- The CLI is designed for testing and development purposes
- Colors automatically disable in non-TTY environments (pipes, redirects)

---

**Signet is just a rollup.** Learn more at [signet.sh](https://signet.sh)
